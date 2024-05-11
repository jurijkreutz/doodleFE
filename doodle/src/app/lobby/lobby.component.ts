import { Component } from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {NgIf} from "@angular/common";

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [
    NgIf
  ],
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.scss'
})
export class LobbyComponent {
  lobbyId: string | null;
  isOwner: boolean;
  copiedCodeToClipboard: boolean = false;

  constructor(private route: ActivatedRoute, private router: Router) {
    this.lobbyId = this.route.snapshot.paramMap.get('id');
    this.isOwner = this.router.getCurrentNavigation()?.extras.state?.['isOwner'];
    console.log(this.isOwner)
  }

  copyToClipboard() {
    if (typeof this.lobbyId === "string") {
      navigator.clipboard.writeText(this.lobbyId).then(() => {
        console.log('Copied to clipboard');
        this.copiedCodeToClipboard = true;
      }, (error) => {
        console.error('Could not copy text: ', error);
      });
    }
  }
}
