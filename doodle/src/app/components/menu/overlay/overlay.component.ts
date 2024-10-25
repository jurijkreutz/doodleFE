import {Component, Output, EventEmitter, OnInit} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {HeartbeatService} from "../../../service/heartbeat.service";

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
  userName: string = "";

  private heartBeatService: HeartbeatService;

  constructor(heartBeatService: HeartbeatService) {
    this.heartBeatService = heartBeatService;
  }

  ngOnInit() {
    this.heartBeatService.stopHeartbeat();
  }

  onNameEnter() {
    this.nameEntered.emit(this.userName);
  }

}
