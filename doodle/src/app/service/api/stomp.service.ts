import { Injectable } from '@angular/core';
import {Message} from "@stomp/stompjs";
import {RxStomp, RxStompConfig} from "@stomp/rx-stomp";

@Injectable({
  providedIn: 'root'
})
export class StompService {

  private rxStomp: RxStomp;

  constructor() {
    const config: RxStompConfig = {
      brokerURL: 'ws://localhost:8080/native-ws',  // Your WebSocket endpoint
      heartbeatIncoming: 0,
      heartbeatOutgoing: 20000,
      reconnectDelay: 200,
      debug: (msg: string) => {
        console.log(msg);
      },
    };

    this.rxStomp = new RxStomp();
    this.rxStomp.configure(config);
    this.rxStomp.activate();
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
    this.rxStomp.watch(`/topic/lobby/${lobbyId}/game-state`).subscribe({
      next: (message: Message) => {
        console.log('Received game state update: ', message.body);
        callback(JSON.parse(message.body));
      },
      error: (err) => {
        console.error('Error subscribing to game state updates in lobby ' + lobbyId, err);
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
    this.rxStomp.publish({ destination: `/app/chat.startGame/${lobbyId}`, body: '{}'});
    this.rxStomp.publish({ destination: `/app/game-state.start/${lobbyId}` });
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

}
