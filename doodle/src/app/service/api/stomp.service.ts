import {Injectable} from '@angular/core';
import {IMessage, Message} from "@stomp/stompjs";
import {RxStomp, RxStompConfig} from "@stomp/rx-stomp";
import {WordToDraw} from "../../models/response.models";
import SockJS from "sockjs-client";
import {environment} from "../../../environments/environment";


@Injectable({
  providedIn: 'root'
})
export class StompService {

  private rxStomp: RxStomp;
  private sessionId: string | null = null;

  constructor() {
    this.rxStomp = new RxStomp();
    this.loadSessionIdFromLocalStorage();
  }

  public loadSessionIdFromLocalStorage(): void {
    this.sessionId = localStorage.getItem('sessionId');
  }

  public configureStomp() {
    this.loadSessionIdFromLocalStorage(); // Refresh session ID on each configuration

    const config: RxStompConfig = {
      webSocketFactory: () => {
        let wsUrl: string;

        if (environment.production) {
          // Production: Use current origin
          wsUrl = `${window.location.origin}/ws`;
        } else {
          // Development/Staging: Use absolute URL from environment
          wsUrl = environment.WEBSOCKET_URL;
        }

        // Add session ID to query parameters
        const url = new URL(wsUrl);
        url.searchParams.set('sessionId', this.sessionId || '');
        wsUrl = url.toString();

        const sock = new SockJS(wsUrl);
        sock.onerror = (error) => {
          console.error('SockJS error:', error);
        };
        return sock;
      },
      connectHeaders: {
        'X-Session-ID': this.sessionId || '' // Add to headers for WebSocket
      },
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
    this.rxStomp.publish({
      destination: `/app/chat.send/${lobbyId}`,
      body: JSON.stringify(message),
      headers: { 'X-Session-ID': this.sessionId || '' }});
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
    })
    this.isGameStateSubscribed = true;
    this.checkAndSendReady(lobbyId);
  }

  public sendGuess(lobbyId: string, guess: string) {
    const guessDTO = { guess };
    this.rxStomp.publish({
      destination: `/app/game-state.guess/${lobbyId}`,
      body: JSON.stringify(guessDTO),
      headers: { 'X-Session-ID': this.sessionId || '' }
    });
  }

  public sendUpdateSpeed(lobbyId: string, message: any) {
    this.rxStomp.publish({
      destination: `/app/chat.changeSpeed/${lobbyId}`,
      body: JSON.stringify(message),
      headers: { 'X-Session-ID': this.sessionId || '' }});
  }

  public sendUpdateRounds(lobbyId: string, message: any) {
    this.rxStomp.publish({
      destination: `/app/chat.changeRounds/${lobbyId}`,
      body: JSON.stringify(message),
      headers: { 'X-Session-ID': this.sessionId || '' }});
  }

  public sendStartGame(lobbyId: string | null, speed: string, rounds: number) {
    if (!lobbyId) {
      console.error('Lobby ID is null or undefined');
      return;
    }
    this.rxStomp.publish({
      destination: `/app/chat.startGame/${lobbyId}`,
      body: '{}',
      headers: { 'X-Session-ID': this.sessionId || '' }});
    this.rxStomp.publish({ destination: `/app/game-state.start/${lobbyId}`,
      body: JSON.stringify({ speed: speed, rounds: rounds }),
      headers: { 'X-Session-ID': this.sessionId || '' }});
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
    this.isGuessNotificationSubscribed = true;
    this.checkAndSendReady(lobbyId);
  }

  public subscribeToDrawingEvents(lobbyId: string, callback: (drawingEvents: any[]) => void) {
    this.rxStomp.watch(`/topic/lobby/${lobbyId}/drawing`).subscribe((message: Message) => {
      callback(JSON.parse(message.body));
    });
  }

  public sendDrawingEvents(lobbyId: string, drawingEvents: any[]) {
    this.rxStomp.publish({
      destination: `/app/drawing/${lobbyId}`,
      body: JSON.stringify(drawingEvents),
      headers: { 'X-Session-ID': this.sessionId || '' }});
  }

  public subscribeToWordChannel(callback: (word: WordToDraw) => void) {
    this.rxStomp.watch('/user/queue/draw-word').subscribe((message: IMessage) => {
      callback(JSON.parse(message.body));
    });
  }

  private isGameStateSubscribed: boolean = false;
  private isGuessNotificationSubscribed: boolean = false;

  private checkAndSendReady(lobbyId: string) {
    if (this.isGameStateSubscribed && this.isGuessNotificationSubscribed) {
      this.sendReadyMessage(lobbyId);
      this.isGameStateSubscribed = false;
      this.isGuessNotificationSubscribed = false;
    }
  }

  private sendReadyMessage(lobbyId: string) {
    this.rxStomp.publish({
      destination: `/app/game-state.ready/${lobbyId}`,
      body: '{}',
      headers: { 'X-Session-ID': this.sessionId || '' }});
  }
}
