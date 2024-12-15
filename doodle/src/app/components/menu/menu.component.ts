import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {RestService} from "../../service/api/rest.service";
import {OverlayComponent} from "./overlay/overlay.component";
import {NgClass, NgIf} from "@angular/common";
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
    NgIf,
    NgClass
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
  menuContainerClass: string = '';

  createLobby() {
    this.restService.sendCreateLobbyRequest().subscribe(
      (response: JoinLobbyResponse) => {
        this.triggerFadeOut();
        setTimeout(() => {
          this.router.navigate(['/lobby/' + response.id], {
            state: { players: response.players, isOwner: true }
          });
        }, 300);
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
        this.triggerFadeOut();
        setTimeout(() => {
        this.router.navigate(['/lobby/' + response.id],
          { state: { players: response.players } });
        }, 300);
      },
      (error: HttpErrorResponse) => {
        console.error('Error joining lobby: ', error.message);
        this.notificationService.showError('Error joining lobby: ' + error.message);
      }
    );
  }

  onNameEntered(data: {name: string, avatar: number}) {
    this.initSession(data.name, data.avatar);
  }

  private initSession(username: string, avatar: number) {
    this.restService.sendInitializeSessionRequest(username, avatar).subscribe(
      () => {
        console.log('Session initialized');
        this.stompService.reconnect();
        this.isOverlayVisible = false;
        this.heartBeatService.startHeartbeat();
      },
      (error: HttpErrorResponse) => {
        console.error('Error initializing session: ', error.message);
        // TODO: If Error message is failed to fetch, show a generic error message
        this.notificationService.showError('Error initializing session: ' + error.message);
      }
    );
  }

  private triggerFadeOut() {
    this.menuContainerClass = 'fade-out';
  }
}
