import { Injectable } from '@angular/core';
import {RestService} from "./api/rest.service";

@Injectable({
  providedIn: 'root'
})
export class HeartbeatService {
  private HEARTBEAT_INTERVAL = 10000; // 10 seconds
  private heartbeatInterval: any;

  constructor(private restService: RestService) {
  }

  public startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.restService.sendHeartbeatRequest().subscribe(
        () => console.log('Heartbeat sent'),
        error => console.error('Error sending heartbeat', error)
      );
    }, this.HEARTBEAT_INTERVAL);
  }

  public stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }
}
