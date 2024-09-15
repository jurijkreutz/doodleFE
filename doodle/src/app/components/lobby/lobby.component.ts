import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {NgForOf, NgIf} from "@angular/common";
import {StompService} from "../../service/api/stomp.service";
import {FormsModule} from "@angular/forms";


@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [
    NgIf,
    NgForOf,
    FormsModule
  ],
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.scss'
})
export class LobbyComponent implements AfterViewInit {
  protected lobbyId: string | null;
  protected isOwner: boolean;
  protected copiedCodeToClipboard: boolean = false;
  protected playerList: string[];
  protected messages: any[] = [];
  protected messageContent: string = '';

  @ViewChild('scrollMe') myScrollContainer!: ElementRef;

  constructor(private route: ActivatedRoute, private router: Router,
              private stompService: StompService) {
    this.lobbyId = this.route.snapshot.paramMap.get('id');
    this.isOwner = this.router.getCurrentNavigation()?.extras.state?.['isOwner']
    this.playerList = this.router.getCurrentNavigation()?.extras.state?.['players'] || [];
  }

  ngAfterViewInit() {
    if (typeof this.lobbyId === "string") {
      this.stompService.subscribeToLobby(this.lobbyId, (message: any) => {
        console.log(message)
        this.playerList = message.players;
      });
      this.stompService.subscribeToChat(this.lobbyId, (message: any) => {
        if (message.sender === 'server-c4fbc994-7b44-4193-8a6d-c39d365eead6' && message.content === 'start-game') {
          this.router.navigate(['/game/' + this.lobbyId]);
        } else {
          this.messages.push(message);
          setTimeout(() => this.scrollToBottom(), 50);
        }
      });
    }
  }

  sendMessage(): void {
    if (this.messageContent.trim() !== '') {
      const chatMessage = {
        content: this.messageContent,
        type: 'CHAT'
      };

      if (typeof this.lobbyId === "string") {
        this.stompService.sendMessage(this.lobbyId, chatMessage);
        this.messageContent = '';
      }
    }
  }

  copyToClipboard() {
    if (typeof this.lobbyId === "string") {
      navigator.clipboard.writeText(this.lobbyId).then(() => {
        this.copiedCodeToClipboard = true;
      });
    }
  }

  startGame() {
    this.router.navigate(['/game/' + this.lobbyId]);
  }

  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch(err) {
      console.error('Could not automatically scroll to bottom: ', err);
    }
  }
}
