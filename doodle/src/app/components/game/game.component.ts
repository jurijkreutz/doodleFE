import {Component, OnInit} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {NgForOf, NgIf} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {StompService} from "../../service/api/stomp.service";

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
    FormsModule,
    NgForOf,
    NgIf
  ],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent implements OnInit{
  lobbyId: string | null = null;
  messages: string[] = [];
  messageContent: string = '';

  constructor(private route: ActivatedRoute, private stompService: StompService) {
    this.lobbyId = this.route.snapshot.paramMap.get('id');
  }

  ngOnInit() {
    this.subscribeToGame();
  }

  private subscribeToGame() {
    if (this.lobbyId) {
      this.stompService.subscribeToGameState(this.lobbyId, (gameState) => {
        console.log('New game state:', gameState);
      });
      this.stompService.subscribeToGameNotifications(this.lobbyId, (notification) => {
        this.messages.push(notification);
        console.log('New game notification:', notification);
      });
    }
  }

  sendGuess() {
    if (this.lobbyId && this.messageContent.trim().length > 0) {
      this.stompService.sendGuess(this.lobbyId, this.messageContent);
      this.messageContent = '';
    }
  }

}
