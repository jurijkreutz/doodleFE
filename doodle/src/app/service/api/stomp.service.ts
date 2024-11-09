import {Injectable} from '@angular/core';
import {IMessage, Message} from "@stomp/stompjs";
import {RxStomp, RxStompConfig} from "@stomp/rx-stomp";
import {map, Observable} from "rxjs";
import {NotificationService} from "../notification.service";
import {Router} from "@angular/router";
import {WordToDraw} from "../../models/response.models";
import {environment} from "../../../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class StompService {

  private rxStomp: RxStomp;

  constructor(private notificationService: NotificationService, private router: Router) {
    this.rxStomp = new RxStomp();
    this.configureStomp();
    this.subscribeToErrors();
  }

  private configureStomp() {
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const host = window.location.hostname;
    const path = environment.WEBSOCKET_URL;
    const brokerURL = `${protocol}${host}${path}`;
    const config: RxStompConfig = {
      brokerURL: brokerURL,
      heartbeatIncoming: 0,
      heartbeatOutgoing: 20000,
      reconnectDelay: 200,
      debug: (msg: string) => {
        console.log('- Stomp: ' + msg);
      },
    };

    this.rxStomp.configure(config);
    this.rxStomp.activate();
  }

  public reconnect() {
    if (this.rxStomp.connected()) {
      this.rxStomp.deactivate().then(() => {
        this.configureStomp();
      });
    } else {
      this.configureStomp();
    }
  }


  /* Lobby */

  public subscribeToLobby(lobbyId: string, callback: (message: any) => void) {
    this.rxStomp.watch(`/topic/lobby/${lobbyId}`).subscribe({
      next: (message: Message) => {
        callback(JSON.parse(message.body));
      },
      error: (err) => {
        console.error('Error subscribing to /topic/lobby/' + lobbyId, err);
      },
      complete: () => {}
    });
  }

  public subscribeToChat(lobbyId: string, callback: (message: any) => void) {
    this.rxStomp.watch(`/topic/lobby/${lobbyId}/chat`).subscribe((message: Message) => {
      callback(JSON.parse(message.body));
    });
  }

  public sendMessage(lobbyId: string, message: any) {
    this.rxStomp.publish({ destination: `/app/chat.send/${lobbyId}`, body: JSON.stringify(message) });
  }

  /* Game */

  public subscribeToGameState(lobbyId: string, callback: (message: any) => void) {
    this.rxStomp.watch(`/topic/lobby/${lobbyId}/game-state`).subscribe({
      next: (message: Message) => {
        callback(JSON.parse(message.body));
      },
      error: (err) => {
        console.error('Error subscribing to game state updates in lobby ' + lobbyId, err);
      },
      complete: () => {}
    });
  }

  public sendGuess(lobbyId: string, guess: string) {
    const guessDTO = { guess };
    this.rxStomp.publish({
      destination: `/app/game-state.guess/${lobbyId}`,
      body: JSON.stringify(guessDTO)
    });
  }

  public sendStartGame(lobbyId: string | null) {
    if (!lobbyId) {
      console.error('Lobby ID is null or undefined');
      return;
    }
    this.rxStomp.publish({ destination: `/app/chat.startGame/${lobbyId}`, body: '{}' });
    this.rxStomp.publish({ destination: `/app/game-state.start/${lobbyId}`, body: '{}' });
  }

  public subscribeToGuessNotification(lobbyId: string, callback: (message: any) => void) {
    this.rxStomp.watch(`/topic/lobby/${lobbyId}/game`).subscribe({
      next: (message: Message) => {
        callback(JSON.parse(message.body));
      },
      error: (err) => {
        console.error('Error subscribing to game notifications', err);
      }
    });
  }

  public subscribeToDrawingEvents(lobbyId: string, callback: (drawingEvents: any[]) => void) {
    this.rxStomp.watch(`/topic/lobby/${lobbyId}/drawing`).subscribe((message: Message) => {
      callback(JSON.parse(message.body));
    });
  }

  public sendDrawingEvents(lobbyId: string, drawingEvents: any[]) {
    this.rxStomp.publish({ destination: `/app/drawing/${lobbyId}`, body: JSON.stringify(drawingEvents) });
  }

  public subscribeToWordChannel(callback: (word: WordToDraw) => void) {
    this.rxStomp.watch('/user/queue/draw-word').subscribe((message: IMessage) => {
      callback(JSON.parse(message.body));
    });
  }

  public errorMessages(): Observable<string> {
    return this.rxStomp.watch('/user/queue/errors').pipe(
      map((message: IMessage) => {
        return message.body;
      })
    );
  }

  private subscribeToErrors() {
    this.errorMessages().subscribe(message => {
      console.error('Error from server:', message);
      this.notificationService.showAsyncError(message + ' Redirecting to start...')
        .then(() => {
          this.router.navigate(['/']);
        });
    });
  }


}
