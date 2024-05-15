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

  disconnect() {
    this.rxStomp.deactivate();
  }
}
