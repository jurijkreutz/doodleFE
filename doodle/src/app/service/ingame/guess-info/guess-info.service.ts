import { Injectable } from '@angular/core';
import {Observable, Subject} from "rxjs";
import {GameMessage} from "../../../components/game/game.component";

@Injectable({
  providedIn: 'root'
})
export class GuessInfoService {

  constructor() { }

  private messagesSubject: Subject<GameMessage[]> = new Subject<GameMessage[]>();
  public messages$: Observable<GameMessage[]> = this.messagesSubject.asObservable();

  private showNextRoundScreenSubject: Subject<{word: string, message: string}> = new Subject<{word: string, message: string}>();
  public showNextRoundScreen$: Observable<{word: string, message: string}> = this.showNextRoundScreenSubject.asObservable();

  private resetEnvironmentSubject: Subject<boolean> = new Subject<boolean>();
  public resetEnvironment$: Observable<boolean> = this.resetEnvironmentSubject.asObservable();

  public handleGuessNotification(guessEvaluation: any) {
    console.log(guessEvaluation);
    if (guessEvaluation.status == "correctly") {
      this.messagesSubject.next([{ type: 'correctly', user: guessEvaluation.userThatGuessed, content: `guessed the word correctly! The word was ${guessEvaluation.word}.` }]);
    } else if (guessEvaluation.status == "incorrectly") {
      this.messagesSubject.next([{ type: 'incorrectly', user: guessEvaluation.userThatGuessed, content: `guessed the word incorrectly. The word was ${guessEvaluation.word}.` }]);
    }
    if (guessEvaluation.status == "correctly") {
      this.handleCorrectGuess(guessEvaluation);
    } else if (guessEvaluation.status == "timeout") {
      this.showNextRoundScreenSubject.next({ word: guessEvaluation.word, message: `Oops! Time is up. The word was:` });
      this.resetEnvironmentSubject.next(false);
    }
  }

  private handleCorrectGuess(guessEvaluation: any) {
    this.resetEnvironmentSubject.next(true);
    this.showNextRoundScreenSubject.next({ word: guessEvaluation.word, message: `${guessEvaluation.userThatGuessed} has guessed correctly. The word was:` });
  }
}
