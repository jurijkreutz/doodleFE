import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ScoreService {

  private scores: Map<string, number> = new Map<string, number>();

  constructor() { }

  public updatePlayerScores(gameState: any) {
    if (typeof gameState.playerScores === 'object' && !Array.isArray(gameState.playerScores)) {
      const sortedEntries = Object.entries(gameState.playerScores as Record<string, number>)
        .sort((a, b) => b[1] - a[1]);
      this.scores = new Map<string, number>(sortedEntries);
    } else if (Array.isArray(gameState.playerScores)) {
      const sortedArray = (gameState.playerScores as [string, number][]).sort((a, b) => b[1] - a[1]);
      this.scores = new Map<string, number>(sortedArray);
    }
  }

  public getScores() {
    return this.scores;
  }
}
