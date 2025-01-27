export class TimeCalculator {

  public static calculateScreenOverlayWaitTime(isFirstRound: boolean, screenOverlayDurationSeconds: number): number {
    return isFirstRound ? screenOverlayDurationSeconds * 1000 : screenOverlayDurationSeconds * 1000 * 2;
  }

  public static calculatePureRoundTime(isFirstRound: boolean, roundTime: number, screenOverlayDurationSeconds: number): number {
    return roundTime - (isFirstRound ? screenOverlayDurationSeconds : screenOverlayDurationSeconds * 2);
  }

}
