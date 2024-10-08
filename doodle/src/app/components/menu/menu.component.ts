import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {RestService} from "../../service/api/rest.service";
import {OverlayComponent} from "./overlay/overlay.component";
import {NgIf} from "@angular/common";
import {Router} from "@angular/router";
import {JoinLobbyResponse} from "../../models/response.models";
import {HttpErrorResponse} from "@angular/common/http";
import {NotificationService} from "../../service/notification.service";
import {HeartbeatService} from "../../service/heartbeat.service";
import {StompService} from "../../service/api/stomp.service";

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    FormsModule,
    OverlayComponent,
    NgIf
  ],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss'
})
export class MenuComponent {
  private restService: RestService;
  isOverlayVisible: boolean = true;
  private router: Router;
  private notificationService: NotificationService;
  private heartBeatService: HeartbeatService;
  private stompService: StompService;

  constructor(restService: RestService,
              router: Router,
              notificationService: NotificationService,
              heartBeatService: HeartbeatService,
              stompService: StompService) {
    this.restService = restService;
    this.router = router;
    this.notificationService = notificationService;
    this.heartBeatService = heartBeatService;
    this.stompService = stompService;
  }

  lobbyCode: string = "";

  createLobby() {
    this.restService.sendCreateLobbyRequest().subscribe(
      (response: JoinLobbyResponse) => {
        this.router.navigate(['/lobby/' + response.id], {
          state: { players: response.players }
        });
      },
      (error: HttpErrorResponse) => {
        console.error('Error creating lobby: ', error.message);
        this.notificationService.showError('Error creating lobby: ' + error.message);
      }
    );
  }

  joinLobby() {
    this.restService.sendJoinLobbyRequest(this.lobbyCode).subscribe(
      (response: JoinLobbyResponse) => {
        this.router.navigate(['/lobby/' + response.id],
          { state: { players: response.players } });
      },
      (error: HttpErrorResponse) => {
        console.error('Error joining lobby: ', error.message);
        this.notificationService.showError('Error joining lobby: ' + error.message);
      }
    );
  }

  onNameEntered(username: string) {
    this.initSession(username);
  }

  private initSession(username: string) {
    this.restService.sendInitializeSessionRequest(username).subscribe(
      () => {
        console.log('Session initialized');
        this.stompService.reconnect();
        this.isOverlayVisible = false;
        this.heartBeatService.startHeartbeat();
      },
      (error: HttpErrorResponse) => {
        console.error('Error initializing session: ', error.message);
        this.notificationService.showError('Error initializing session: ' + error.message);
      }
    );
  }


}
