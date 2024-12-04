import {Component, Output, EventEmitter, OnInit} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {HeartbeatService} from "../../../service/heartbeat.service";
import {NotificationService} from "../../../service/notification.service";

@Component({
  selector: 'app-overlay',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './overlay.component.html',
  styleUrl: './overlay.component.scss'
})
export class OverlayComponent implements OnInit {
  @Output() nameEntered = new EventEmitter<string>();
  protected userName: string = "";
  protected maxNameLength: number = 20;

  private heartBeatService: HeartbeatService;
  private notificationService: NotificationService;

  constructor(heartBeatService: HeartbeatService, notificationService: NotificationService) {
    this.heartBeatService = heartBeatService;
    this.notificationService = notificationService;
  }

  ngOnInit() {
    this.heartBeatService.stopHeartbeat();
  }

  onNameEnter() {
    if (this.userName.trim().length > 0) {
      this.nameEntered.emit(this.userName);
    } else {
      this.notificationService.showError('You need a name to play!');
    }
  }
}
