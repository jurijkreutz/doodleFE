import { Component } from '@angular/core';
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss'
})
export class MenuComponent {

  lobbyCode: string = "";

  createLobby() {
    // Implement your logic to create a new lobby here
  }

  joinLobby() {
    // Implement your logic to join a lobby using this.lobbyCode here
  }

}
