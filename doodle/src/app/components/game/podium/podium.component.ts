import {Component, Input} from '@angular/core';
import {NgClass, NgIf} from "@angular/common";
import {Player} from "../../../models/response.models";

@Component({
  selector: 'app-podium',
  standalone: true,
  imports: [
    NgClass,
    NgIf
  ],
  templateUrl: './podium.component.html',
  styleUrl: './podium.component.scss'
})
export class PodiumComponent {
  @Input() scores: Map<string, number> = new Map<string, number>();
  @Input() playerList: Player[] = [];

  get sortedScores(): [string, number][] {
    return [...this.scores.entries()].sort((a, b) => b[1] - a[1]);
  }

  protected getAvatarUrl(playerName: string): string {
    const avatar = this.playerList.find(player => player.username === playerName)?.avatar;
    return `/assets/avatars/avatar-${avatar}.webp`;
  }

  protected getScoreClass(playerName: string): string {
    const scoresArray = [...this.scores.values()].sort((a, b) => b - a);

    const highestScore = scoresArray[0];
    const secondHighest = scoresArray[1] ?? 0;
    const thirdHighest = scoresArray[2] ?? 0;

    const playerScore = this.scores.get(playerName);

    if (playerScore === highestScore) {
      return 'gold-badge';
    } else if (playerScore === secondHighest) {
      return 'silver-badge';
    } else if (playerScore === thirdHighest) {
      return 'bronze-badge'; // or however you style 3rd place
    } else if (playerScore === undefined || playerScore < 0) {
      return 'negative-score';
    } else {
      return 'default-badge';
    }
  }

}
