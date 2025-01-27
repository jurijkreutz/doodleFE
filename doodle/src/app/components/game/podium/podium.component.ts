import { Component, Input } from '@angular/core';
import { NgClass, NgIf, NgFor } from "@angular/common";
import { Player } from "../../../models/response.models";

interface RankedPlayer {
  playerName: string;
  score: number;
  rank: number;
}

@Component({
  selector: 'app-podium',
  standalone: true,
  imports: [
    NgClass,
    NgIf,
    NgFor
  ],
  templateUrl: './podium.component.html',
  styleUrls: ['./podium.component.scss']
})
export class PodiumComponent {
  @Input() scores: Map<string, number> = new Map<string, number>();
  @Input() playerList: Player[] = [];

  get rankedScores(): RankedPlayer[] {
    const scoreArray = [...this.scores.entries()].map(([playerName, score]) => ({ playerName, score }));
    scoreArray.sort((a, b) => b.score - a.score);
    const distinctScores: number[] = [];
    scoreArray.forEach((item) => {
      if (!distinctScores.includes(item.score)) {
        distinctScores.push(item.score);
      }
    });
    distinctScores.sort((a, b) => b - a);
    return scoreArray.map((item) => {
      const rank = distinctScores.indexOf(item.score) + 1;
      return { ...item, rank };
    });
  }

  get topThree(): RankedPlayer[] {
    return this.rankedScores.filter(r => r.rank <= 3);
  }

  get beyondThree(): RankedPlayer[] {
    return this.rankedScores.filter(r => r.rank > 3);
  }

  get hasBeyondThree(): boolean {
    return this.rankedScores.some(r => r.rank > 3);
  }

  protected getAvatarUrl(playerName: string): string {
    const avatar = this.playerList.find(player => player.username === playerName)?.avatar;
    return `/assets/avatars/avatar-${avatar}.webp`;
  }

  protected getBadgeClass(score: number): string {
    if (score < 0) {
      return 'negative-score';
    }
    return 'default-badge';
  }
}
