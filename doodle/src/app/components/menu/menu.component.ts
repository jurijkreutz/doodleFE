import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {RestService} from "../../service/rest.service";
import {OverlayComponent} from "./overlay/overlay.component";
import {NgIf} from "@angular/common";
import {Router} from "@angular/router";
import {JoinLobbyResponse} from "../../models/response.models";
import {HttpErrorResponse} from "@angular/common/http";
import {NotificationService} from "../../service/notification.service";

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

  constructor(restService: RestService,
              router: Router,
              notificationService: NotificationService) {
    this.restService = restService;
    this.router = router;
    this.notificationService = notificationService;
  }

  lobbyCode: string = "";

  createLobby() {
    this.restService.sendCreateLobbyRequest().subscribe(
      (response: JoinLobbyResponse) => {
        this.router.navigate(['/lobby/' + response.id], {
          state: { lobby: response.isOwner, players: response.players }
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
        console.log(response);
        this.router.navigate(['/lobby/' + response.id],
          { state: { lobby: response.isOwner, players: response.players } });
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
        this.isOverlayVisible = false;
      },
      (error: HttpErrorResponse) => {
        console.error('Error initializing session: ', error.message);
        this.notificationService.showError('Error initializing session: ' + error.message);
      }
    );
  }


}
