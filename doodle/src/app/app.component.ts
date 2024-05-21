import {Component, OnDestroy, OnInit} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {RestService} from "./service/api/rest.service";
import {NotificationComponent} from "./notification/notification.component";
import {HeartbeatService} from "./service/heartbeat.service";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NotificationComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnDestroy {
  title = 'doodle';

  constructor(private restService: RestService,
              private heartbeatService: HeartbeatService) { }

  ngOnDestroy(): void {
    this.heartbeatService.stopHeartbeat();
  }

}
