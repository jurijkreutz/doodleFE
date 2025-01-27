export class ScoreClass {

  public static getScoreClass(playerName: string, currentScores: Map<string, number>): string {
    const scoresArray = [...currentScores.values()];
    const highestScore = Math.max(...scoresArray);
    const secondHighest = scoresArray.sort((a, b) => b - a)[1] || 0;
    const score = currentScores.get(playerName);

    if (score === highestScore) return 'gold-badge';
    if (score === secondHighest) return 'silver-badge';
    if (score === undefined || score < 0) return 'negative-score';
    return 'default-badge';
  }

}
