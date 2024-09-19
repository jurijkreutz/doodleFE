import { Injectable } from '@angular/core';
import {RestService} from "./api/rest.service";
import {NotificationService} from "./notification.service";
import {Router} from "@angular/router";

@Injectable({
  providedIn: 'root'
})
export class HeartbeatService {
  private HEARTBEAT_INTERVAL = 10000; // 10 seconds
  private heartbeatInterval: any;
  private failureCount: number = 0; // Track consecutive failures
  private maxFailures: number = 3; // Threshold for redirecting

  constructor(private restService: RestService,
              private notificationService: NotificationService,
              private router: Router) {
  }

  public startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.restService.sendHeartbeatRequest().subscribe(
        () => console.log('Heartbeat sent'),
        error => {
          console.error('Heartbeat failed:', error);
          this.failureCount++;
          this.notificationService.showError('Connection lost... Retrying...');

          if (this.failureCount >= this.maxFailures) {
            this.handleConnectionLost();
          }
        }
      );
    }, this.HEARTBEAT_INTERVAL);
  }

  public stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }

  private handleConnectionLost(): void {
    this.stopHeartbeat();
    this.notificationService.showError('Connection lost. Redirecting to main page...');
    this.failureCount = 0;
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 3000);
  }
}
