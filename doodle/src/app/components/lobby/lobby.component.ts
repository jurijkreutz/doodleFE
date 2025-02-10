import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {NgForOf, NgIf} from "@angular/common";
import {StompService} from "../../service/api/stomp.service";
import {FormsModule} from "@angular/forms";
import {Player} from "../../models/response.models";


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
export class LobbyComponent implements AfterViewInit, OnInit {
  protected lobbyId: string | null;
  protected isOwner: boolean;
  protected copiedCodeToClipboard: boolean = false;
  protected playerList: Player[] = [];
  protected messages: any[] = [];
  protected newPlayerBubble: { username: string, avatar: string } | null = null;
  protected messageContent: string = '';
  protected maxMessageLength: number = 100;

  protected selectedSpeed: string = 'rapid';
  protected selectedRounds: number = 5; // default = 5
  protected roundsOptions: number[] = [1, 5, 10, 15];

  @ViewChild('scrollMe') myScrollContainer!: ElementRef;

  constructor(private route: ActivatedRoute, private router: Router,
              private stompService: StompService) {
    this.lobbyId = this.route.snapshot.paramMap.get('id');
    this.isOwner = this.router.getCurrentNavigation()?.extras.state?.['isOwner']
    this.playerList = this.router.getCurrentNavigation()?.extras.state?.['players'] || [];
    this.selectedRounds = parseInt(this.router.getCurrentNavigation()?.extras.state?.['rounds']) || 5;
    this.selectedSpeed = this.router.getCurrentNavigation()?.extras.state?.['speed'] || 'rapid';
  }

  ngOnInit() {
    localStorage.removeItem('hasVisitedGame');
    localStorage.removeItem('initialTotalRounds');
  }

  ngAfterViewInit() {
    if (typeof this.lobbyId === "string") {
      this.stompService.subscribeToLobby(this.lobbyId, (message: any) => {
        this.pushChatMessageWhenPlayerJoins(message.players);
        this.pushChatMessageWhenPlayerLeaves(message.players);
        this.playerList = message.players;
      });
      this.stompService.subscribeToChat(this.lobbyId, (message: any) => {
        if (message.sender === 'server-c4fbc994-7b44-4193-8a6d-c39d365eead6' && message.content === 'start-game') {
          this.router.navigate(['/game/' + this.lobbyId], {
            state: { isOwner: false }
          });
        } else if (message.sender === 'server-c4fbc994-7b44-4193-8a6d-c39d365eead6' && message.content.startsWith('change-speed:')) {
          this.selectedSpeed = message.content.split(':')[1];
        } else if (message.sender === 'server-c4fbc994-7b44-4193-8a6d-c39d365eead6' && message.content.startsWith('change-rounds:')) {
          this.selectedRounds = parseInt(message.content.split(':')[1]);
        } else {
          this.messages.push(message);
          setTimeout(() => this.scrollToBottom(), 50);
        }
      });
    }
  }

  protected onSpeedChange(newSpeed: string) {
    console.log('Speed changed to:', newSpeed);
    this.handleSpeedChange(newSpeed);
  }

  private handleSpeedChange(newSpeed: string) {
    const chatMessage = {
      content: newSpeed,
      type: 'CHAT'
    };
    if (typeof this.lobbyId === "string") {
      this.stompService.sendUpdateSpeed(this.lobbyId, chatMessage);
    }
  }

  protected onRoundsChange(newRounds: number) {
    console.log('Rounds changed to:', newRounds);
    this.handleRoundsChange(newRounds);
  }

  private handleRoundsChange(newRounds: number) {
    const chatMessage = {
      content: newRounds.toString(),
      type: 'CHAT'
    }
    if (typeof this.lobbyId === "string") {
      this.stompService.sendUpdateRounds(this.lobbyId, chatMessage);
    }
  }

  protected sendMessage(): void {
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

  private pushChatMessageWhenPlayerJoins(newPlayerList: Player[]) {
    newPlayerList.forEach(player => {
      if (!this.playerList.some(existingPlayer => existingPlayer.username === player.username)) {
        this.messages.push({
          sender: 'SketchOff',
          content: player.username + ' joined the lobby.',
          type: 'CHAT'
        });
        this.initFloatingPlayerBubble(player);
        setTimeout(() => this.scrollToBottom(), 50);
      }
    });
  }

  private initFloatingPlayerBubble(player: Player) {
    this.newPlayerBubble = {
      username: player.username,
      avatar: player.avatar
    };
    setTimeout(() => {
      this.newPlayerBubble = null;
    }, 2000);
  }

  protected copyToClipboard() {
    if (typeof this.lobbyId === "string") {
      if(navigator.clipboard) {
        navigator.clipboard.writeText(this.lobbyId).then(() => {
          this.copiedCodeToClipboard = true;
        });
      }
      else{
        alert('Copy this code and send it to others: ' + this.lobbyId);
      }
    }
  }

  protected startGame() {
    if (this.playerList.length < 2) {
      this.messages.push({
        sender: 'SketchOff',
        content: "You can`t play alone! Invite some friends to join the game.",
        type: 'CHAT'
      });
      setTimeout(() => this.scrollToBottom(), 50);
    } else {
      this.router.navigate(['/game/' + this.lobbyId],
        {state: { isOwner: true, speed: this.selectedSpeed, rounds: this.selectedRounds }}
      );
    }
  }

  private scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch(err) {
      console.error('Could not automatically scroll to bottom: ', err);
    }
  }

  protected getAvatarUrl(avatar: string): string {
    return `/assets/avatars/avatar-${avatar}.webp`;
  }

  private pushChatMessageWhenPlayerLeaves(newPlayerList: Player[]) {
    this.playerList.forEach(existingPlayer => {
      if (!newPlayerList.some(player => player.username === existingPlayer.username)) {
        this.messages.push({
          sender: 'SketchOff',
          content: existingPlayer.username + ' left the lobby.',
          type: 'CHAT'
        });
        setTimeout(() => this.scrollToBottom(), 50);
      }
    });
  }
}
