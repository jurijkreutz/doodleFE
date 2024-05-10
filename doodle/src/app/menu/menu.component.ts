import {Component} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {RestService} from "../service/rest.service";
import {OverlayComponent} from "./overlay/overlay.component";
import {NgIf} from "@angular/common";

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

  constructor(restService: RestService) {
    this.restService = restService;
  }

  lobbyCode: string = "";

  createLobby() {
    // Implement your logic to create a new lobby here
  }

  joinLobby() {
    this.restService.sendJoinLobbyRequest(this.lobbyCode).subscribe((response) => {
      console.log(response);
    });
  }

  onNameEntered(username: string) {
    this.isOverlayVisible = false;
    this.initSession(username);
  }

  private initSession(username: string) {
    this.restService.sendInitializeSessionRequest(username).subscribe((response) => {
      console.log('Session initialized');
    });
  }


}
