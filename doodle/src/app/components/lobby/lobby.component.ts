import {AfterViewInit, Component} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {NgForOf, NgIf} from "@angular/common";
import {StompService} from "../../service/stomp.service";
import {RestService} from "../../service/rest.service";


@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [
    NgIf,
    NgForOf
  ],
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.scss'
})
export class LobbyComponent implements AfterViewInit {
  protected lobbyId: string | null;
  protected isOwner: boolean;
  protected copiedCodeToClipboard: boolean = false;
  protected playerList: string[];

  constructor(private route: ActivatedRoute, private router: Router,
              private stompService: StompService, private restService: RestService) {
    this.lobbyId = this.route.snapshot.paramMap.get('id');
    this.isOwner = this.router.getCurrentNavigation()?.extras.state?.['isOwner']
    this.playerList = this.router.getCurrentNavigation()?.extras.state?.['players'] || [];
  }

  ngAfterViewInit() {
    if (typeof this.lobbyId === "string") {
      this.stompService.subscribeToLobby(this.lobbyId, (message: any) => {
        this.playerList = message.players;
      });
    }
    window.addEventListener('beforeunload', this.beforeUnloadHandler.bind(this));
  }

  beforeUnloadHandler(event: BeforeUnloadEvent) {
    if (typeof this.lobbyId === "string") {
      this.restService.sendLeaveLobbyRequest(this.lobbyId).subscribe(() => {
        console.log('Left lobby:', this.lobbyId);
      });
    }
  }

  copyToClipboard() {
    if (typeof this.lobbyId === "string") {
      navigator.clipboard.writeText(this.lobbyId).then(() => {
        this.copiedCodeToClipboard = true;
      });
    }
  }
}
