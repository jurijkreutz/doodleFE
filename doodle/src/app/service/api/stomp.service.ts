import {Injectable} from '@angular/core';
import {IMessage, Message} from "@stomp/stompjs";
import {RxStomp, RxStompConfig} from "@stomp/rx-stomp";
import {map, Observable} from "rxjs";
import {NotificationService} from "../notification.service";
import {Router} from "@angular/router";

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
    const config: RxStompConfig = {
      brokerURL: 'ws://localhost:8080/native-ws',
      heartbeatIncoming: 0,
      heartbeatOutgoing: 20000,
      reconnectDelay: 200,
      debug: (msg: string) => {
        console.log(msg);
      },
    };

    this.rxStomp.configure(config);
    this.rxStomp.activate();
  }

  public reconnect() {
    if (this.rxStomp.connected()) {
      console.log('Deactivating current connection before reconnecting...');
      this.rxStomp.deactivate().then(() => {
        console.log('Deactivated stomp. Reconnecting...');
        this.configureStomp();
      });
    } else {
      this.configureStomp();
    }
  }


  /* Lobby */

  public subscribeToLobby(lobbyId: string, callback: (message: any) => void) {
    console.log(`Attempting to subscribe to /topic/lobby/${lobbyId}`);
    this.rxStomp.watch(`/topic/lobby/${lobbyId}`).subscribe({
      next: (message: Message) => {
        console.log('Received lobby update message: ', message.body);
        callback(JSON.parse(message.body));
      },
      error: (err) => {
        console.error('Error subscribing to /topic/lobby/' + lobbyId, err);
      },
      complete: () => {
        console.log('Subscription to /topic/lobby/' + lobbyId + ' completed');
      }
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
    console.log(`Attempting to subscribe to /topic/lobby/${lobbyId}/game-state`);
    this.rxStomp.watch(`/topic/lobby/${lobbyId}/game-state`).subscribe({
      next: (message: Message) => {
        console.log('Received game state update for lobby ${lobbyId}: ', message.body);
        callback(JSON.parse(message.body));
      },
      error: (err) => {
        console.error('Error subscribing to game state updates in lobby ' + lobbyId, err);
      },
      complete: () => {
        console.log(`Subscription to /topic/lobby/${lobbyId}/game-state completed`);
      }
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

  public subscribeToGameNotifications(lobbyId: string, callback: (message: any) => void) {
    this.rxStomp.watch(`/topic/lobby/${lobbyId}/game`).subscribe({
      next: (message: Message) => {
        console.log(message);
        console.log('Received game notification:', message.body);
        callback(JSON.parse(JSON.stringify(message.body)));
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

  public subscribeToWordChannel() {
    this.rxStomp.watch('/user/queue/draw-word').subscribe((message: IMessage) => {
      console.log('Received word:', message.body);
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
