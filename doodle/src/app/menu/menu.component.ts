import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {RestService} from "../service/rest.service";
import {OverlayComponent} from "./overlay/overlay.component";
import {NgIf} from "@angular/common";
import {Router} from "@angular/router";
import {JoinLobbyResponse} from "../models/response.models";
import {HttpErrorResponse} from "@angular/common/http";

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

  constructor(restService: RestService, router: Router) {
    this.restService = restService;
    this.router = router;
  }

  lobbyCode: string = "";

  createLobby() {
    this.restService.sendCreateLobbyRequest().subscribe(
      (response: JoinLobbyResponse) => {
        this.router.navigate(['/lobby/' + response.id], { state: { isOwner: true } });
      },
      (error: HttpErrorResponse) => {
        console.error('Error creating lobby: ', error.error.message);
        // Handle error, e.g. show error message to user
      }
    );
  }

  joinLobby() {
    this.restService.sendJoinLobbyRequest(this.lobbyCode).subscribe(
      (response: JoinLobbyResponse) => {
        this.router.navigate(['/lobby/' + response.id], { state: { isOwner: response.isOwner } });
      },
      (error: HttpErrorResponse) => {
        console.error('Error creating lobby: ', error.error.message);
        // Handle error, e.g. show error message to user
      }
    );
  }

  onNameEntered(username: string) {
    this.initSession(username);
  }

  private initSession(username: string) {
    this.restService.sendInitializeSessionRequest(username).subscribe((response) => {
      console.log('Session initialized');
      this.isOverlayVisible = false;
    });
  }


}
