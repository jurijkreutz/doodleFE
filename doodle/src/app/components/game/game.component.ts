import {AfterViewInit, Component, ElementRef, OnDestroy, ViewChild} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {KeyValuePipe, NgClass, NgForOf, NgIf} from "@angular/common";
import {ActivatedRoute, Router} from "@angular/router";
import {StompService} from "../../service/api/stomp.service";
import {WordOverlayComponent} from "./word-overlay/word-overlay.component";
import {Player, WordToDraw} from "../../models/response.models";
import {NextRoundOverlayComponent} from "./next-round-overlay/next-round-overlay.component";
import {filter, Subject, take} from "rxjs";
import confetti from 'canvas-confetti';
import {NotificationService} from "../../service/notification.service";

interface GameMessage {
  type: string;
  user?: string;
  content: string;
}

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
    FormsModule,
    NgForOf,
    NgIf,
    WordOverlayComponent,
    NextRoundOverlayComponent,
    KeyValuePipe,
    NgClass
  ],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent implements AfterViewInit, OnDestroy{
  @ViewChild('drawingCanvas') drawingCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('scrollMe') myScrollContainer!: ElementRef;

  private canvasContext!: CanvasRenderingContext2D;
  private isDrawing = false;
  private sendInterval = 10; // ms
  private drawingEventsBuffer: any[] = [];

  // protected values for template binding
  protected maxGuessLength: number = 30;
  protected isWaitingForGameStart: boolean = true;
  protected isWaitingForDrawer: boolean = false;
  protected messages: GameMessage[] = [];
  protected messageContent: string = '';
  protected isDrawer: boolean = false;
  protected wordToDraw: string = '';
  protected wordOverlayShown: boolean = false;
  protected wordInHeadShown: boolean = false;
  protected scores: Map<string, number> = new Map<string, number>();
  protected correctlyGuessedWord: string = '';
  protected userThatGuessed: string = '';
  protected nextDrawer: string = '';
  protected nextRoundScreenShown: boolean = false;
  protected colors: string[] = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

  private isOwner: boolean = false;
  private selectedSpeed: string = '';
  private lobbyId: string | null = null;
  private playerList: Player[] = [];
  private isFirstRound: boolean = true;
  private isWaitingForServer: boolean = false;
  private selectedColor: string = '#000000';

  private readonly SCREEN_OVERLAY_DURATION_SECONDS = 5; // only change this value if you change in backend as well

  private countdownInterval: any;
  private countdownTimeout: any;

  private nextRoundScreenSubject = new Subject<boolean>();

  private boundStartDrawing = this.startDrawing.bind(this);
  private boundDraw = this.draw.bind(this);
  private boundStopDrawing = this.stopDrawing.bind(this);

  constructor(private route: ActivatedRoute,
              private stompService: StompService,
              private notificationService: NotificationService,
              private router: Router) {
    this.lobbyId = this.route.snapshot.paramMap.get('id');
    this.isOwner = this.router.getCurrentNavigation()?.extras.state?.['isOwner']
    this.selectedSpeed = this.router.getCurrentNavigation()?.extras.state?.['speed'];
    this.redirectToStartOnGameStartTimeOut();
  }

  ngAfterViewInit() {
    this.subscribeToGame();
    this.prepareDrawingEnv(false);
    this.subscribeToWordChannel();
    if (this.isOwner) {
      this.stompService.sendStartGame(this.lobbyId, this.selectedSpeed);
    }
    this.initializeDrawingEventSender();
  }

  ngOnDestroy() {
    this.clearTimeoutAndInterval();
    this.removeCanvasEventListeners();
  }

  private initializeDrawingEventSender() {
    setInterval(() => {
      if (this.drawingEventsBuffer.length > 0) {
        this.sendBufferedDrawingEvents();
      }
    }, this.sendInterval);
  }

  private subscribeToGame() {
    if (this.lobbyId) {
      this.stompService.subscribeToGameState(this.lobbyId, (gameState) => {
        this.updateLocalGameState(gameState);
      });
      this.stompService.subscribeToGuessNotification(this.lobbyId, (guessEvaluation) => {
        this.handleGuessNotification(guessEvaluation);
      });
    }
  }

  private handleGuessNotification(guessEvaluation: any) {
    this.isWaitingForServer = false;
    if (guessEvaluation.status == "correctly") {
      this.messages.push({ type: 'correctly', user: guessEvaluation.userThatGuessed, content: `guessed the word correctly! The word was ${guessEvaluation.word}.` });
    } else if (guessEvaluation.status == "incorrectly") {
      this.messages.push({ type: 'incorrectly', user: guessEvaluation.userThatGuessed, content: `${guessEvaluation.word}` });
    }
    if (guessEvaluation.status == "correctly") {
      this.handleCorrectGuess(guessEvaluation);
    } else if (guessEvaluation.status == "timeout") {
      this.showNextRoundScreen(guessEvaluation.word, `Oops! Time is up. The word was:`);
      this.resetEnvironment();
    }
    setTimeout(() => this.scrollToBottom(), 50);
  }

  private updateLocalGameState(gameState: any) {
    this.isWaitingForGameStart = false;
    this.clearCanvas();
    this.nextDrawer = gameState.drawerName;
    this.playerList = gameState.players;
    if (typeof gameState.playerScores === 'object' && !Array.isArray(gameState.playerScores)) {
      this.scores = new Map<string, number>(Object.entries(gameState.playerScores));
    } else if (Array.isArray(gameState.playerScores)) {
      this.scores = new Map<string, number>(gameState.playerScores);
    } else {
      console.error('Unexpected format for playerScores:', gameState.playerScores);
      this.scores = new Map<string, number>();
    }
    let roundTime: number = gameState.roundTime;
    this.handleCountdown(roundTime);
  }

  private handleCountdown(roundTime: number) {
    this.clearTimeoutAndInterval();
    let pureRoundTime = this.calculatePureRoundTime(roundTime);
    const totalDuration = pureRoundTime;
    const progressBar = document.getElementById('progress-bar') as HTMLElement;
    this.resetProgressBar(progressBar);
    const screenOverlayWaitTime = this.calculateScreenOverlayWaitTime();
    this.isFirstRound = false;
    this.isWaitingForDrawer = true;
    this.countdownTimeout = setTimeout(() => { // wait while the overlays are being shown
      this.clearCanvas();
      this.pushNewDrawingChatMessage();
      this.countdownInterval = setInterval(() => {
        if (pureRoundTime > 0) {
          pureRoundTime = this.countDownTime(pureRoundTime, totalDuration, progressBar);
        } else {
          this.waitForServerIfTimeIsUp();
        }
      }, 1000);
      this.isWaitingForDrawer = false;
    }, screenOverlayWaitTime);
  }

  private pushNewDrawingChatMessage() {
    this.messages.push({type: 'new-round', content: `New drawing. Get ready to guess!`});
    setTimeout(() => this.scrollToBottom(), 50);
  }

  private waitForServerIfTimeIsUp() {
    this.isWaitingForServer = true;
    clearInterval(this.countdownInterval);
    this.handleServerTimeout();
  }

  private countDownTime(pureRoundTime: number, totalDuration: number, progressBar: HTMLElement) {
    pureRoundTime--;
    this.updateProgressBar(pureRoundTime, totalDuration, progressBar);
    return pureRoundTime;
  }

  private calculateScreenOverlayWaitTime() {
    return this.isFirstRound ? this.SCREEN_OVERLAY_DURATION_SECONDS * 1000 : this.SCREEN_OVERLAY_DURATION_SECONDS * 1000 * 2;
  }

  private calculatePureRoundTime(roundTime: number) {
    return roundTime -
      (this.isFirstRound ? this.SCREEN_OVERLAY_DURATION_SECONDS : this.SCREEN_OVERLAY_DURATION_SECONDS * 2);
  }

  private clearTimeoutAndInterval() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    if (this.countdownTimeout) {
      clearTimeout(this.countdownTimeout);
    }
  }

  private updateProgressBar(roundTime: number, totalDuration: number, progressBar: HTMLElement) {
    const progressPercentage = (roundTime / totalDuration) * 100;
    if (progressBar) {
      progressBar.style.width = `${progressPercentage}%`;
      switch (true) {
        case (progressPercentage > 50):
          progressBar.style.backgroundColor = '#4caf50';
          progressBar.classList.remove('pulsate');
          break;
        case (progressPercentage > 30):
          progressBar.style.backgroundColor = '#af824c';
          break;
        case (progressPercentage > 20):
          progressBar.style.backgroundColor = '#af4c79';
          break;
        default:
          progressBar.style.backgroundColor = '#e32e2e';
          if (!progressBar.classList.contains('pulsate')) {
            progressBar.classList.add('pulsate');
          }
      }
    }
    console.log('Round time:', roundTime);
  }

  private resetProgressBar(progressBar: HTMLElement) {
    if (progressBar) {
      progressBar.style.width = '100%';
      progressBar.style.backgroundColor = '#4caf50';
      progressBar.classList.remove('pulsate');
    }
  }

  private handleServerTimeout() {
    const delay = 10000;
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    setTimeout(() => {
      if (this.isWaitingForServer) {
        const message1 = 'Hm... Looks like there is a problem. Waiting for another 5 seconds...'
        this.notificationService.showError(message1);
      }
      setTimeout(() => {
        if (this.isWaitingForServer) {
          const message2 = 'We have a problem with the connection. Redirecting to start...';
          this.notificationService.showAsyncError(message2)
            .then(() => {
              this.router.navigate(['/']);
            });
        }
      }, delay);
    }, delay);
  }

  private handleCorrectGuess(guessEvaluation: any) {
    this.resetEnvironment();
    this.triggerConfetti();
    this.showNextRoundScreen(
      guessEvaluation.word,
      `${guessEvaluation.userThatGuessed} has guessed correctly. The word was:`);
  }

  private resetEnvironment() {
    this.isDrawer = false;
    this.removeCanvasEventListeners();
    this.wordToDraw = '';
    this.wordOverlayShown = false;
    this.wordInHeadShown = false;
  }

  private triggerConfetti() {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }

  private subscribeToWordChannel() {
    this.stompService.subscribeToWordChannel((word) => {
      this.waitForNextRoundScreenToClose().then(() => {
        this.prepareDrawingEnv(true);
        this.showWordToDraw(word);
      });
    });
  }

  private updateNextRoundScreenShown(value: boolean) {
    this.nextRoundScreenShown = value;
    this.nextRoundScreenSubject.next(value);
  }


  private showNextRoundScreen(guessEvaluation: string, userThatGuessed: string) {
    this.correctlyGuessedWord = guessEvaluation;
    this.userThatGuessed = userThatGuessed;
    this.updateNextRoundScreenShown(true);
    setTimeout(() => {
      this.updateNextRoundScreenShown(false);
      this.correctlyGuessedWord = '';
      this.userThatGuessed = '';
    }, this.SCREEN_OVERLAY_DURATION_SECONDS * 1000);
  }

  private waitForNextRoundScreenToClose(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.nextRoundScreenShown) {
        resolve();
      } else {
        this.nextRoundScreenSubject.pipe(
          filter((shown) => !shown),
          take(1)
        ).subscribe(() => resolve());
      }
    });
  }

  private showWordToDraw(word: WordToDraw) {
    this.wordToDraw = word.word;
    this.wordOverlayShown = true;
    setTimeout(() => {
      this.wordOverlayShown = false;
      this.wordInHeadShown = true;
    }, 5000);
  }

  sendGuess() {
    if (this.lobbyId && this.messageContent.trim().length > 0) {
      this.stompService.sendGuess(this.lobbyId, this.messageContent);
      this.messageContent = '';
    }
  }

  private prepareDrawingEnv(isDrawer: boolean) {
    if (!isDrawer) {
      this.removeCanvasEventListeners();
    }

    this.isDrawer = isDrawer;
    this.drawingEventsBuffer = [];
    this.setupCanvas();
    this.subscribeToDrawingEvents();
  }

  private setupCanvas() {
    const canvas = this.drawingCanvas.nativeElement;
    this.canvasContext = canvas.getContext('2d')!;

    this.canvasContext.lineWidth = 5;
    this.canvasContext.lineCap = 'round';

    if (this.isDrawer) {
      canvas.addEventListener('mousedown', this.boundStartDrawing);
      canvas.addEventListener('mousemove', this.boundDraw);
      canvas.addEventListener('mouseup', this.boundStopDrawing);
      canvas.addEventListener('mouseout', this.boundStopDrawing);
    }
  }

  private clearCanvas() {
    if (this.canvasContext && this.drawingCanvas) {
      this.canvasContext.clearRect(0, 0,
        this.drawingCanvas.nativeElement.width,
        this.drawingCanvas.nativeElement.height);
      this.canvasContext.fillStyle = '#FFFFFF';
      this.canvasContext.fillRect(0, 0,
        this.drawingCanvas.nativeElement.width,
        this.drawingCanvas.nativeElement.height);
    }
  }


  private getMousePosition(event: MouseEvent) {
    const rect = this.drawingCanvas.nativeElement.getBoundingClientRect();
    const scaleX = this.drawingCanvas.nativeElement.width / rect.width;
    const scaleY = this.drawingCanvas.nativeElement.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  private startDrawing(event: MouseEvent) {
    if (!this.isDrawer) return;
    this.isDrawing = true;
    const pos = this.getMousePosition(event);
    this.canvasContext.beginPath();
    this.canvasContext.moveTo(pos.x, pos.y);
    this.canvasContext.strokeStyle = this.selectedColor;
    this.addDrawingEventToBuffer('start', pos);
  }

  private draw(event: MouseEvent) {
    if (!this.isDrawing || !this.isDrawer) return;
    const pos = this.getMousePosition(event);
    this.canvasContext.lineTo(pos.x, pos.y);
    this.canvasContext.stroke();
    this.addDrawingEventToBuffer('draw', pos); // Add to buffer
  }

  private stopDrawing() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.canvasContext.closePath();
    this.addDrawingEventToBuffer('stop', null);
  }

  private addDrawingEventToBuffer(type: string, pos: { x: number; y: number } | null) {
    if (this.lobbyId) {
      const drawingEvent = {
        type,
        position: pos,
        color: this.selectedColor,
        lineWidth: this.canvasContext.lineWidth
      };
      this.drawingEventsBuffer.push(drawingEvent); // Add to buffer
    }
  }

  private sendBufferedDrawingEvents() {
    if (this.lobbyId && this.drawingEventsBuffer.length > 0) {
      this.stompService.sendDrawingEvents(this.lobbyId, this.drawingEventsBuffer);
      this.drawingEventsBuffer = [];
    }
  }

  protected selectColor(color: string) {
    this.selectedColor = color;
  }

  private processDrawingEvent(drawingEvents: any[]) {
    if (!this.canvasContext) {
      console.error('Canvas context is not initialized');
      return;
    }
    for (let i = 0; i < drawingEvents.length; i++) {
      const drawingEvent = drawingEvents[i];
      this.canvasContext.strokeStyle = drawingEvent.color;
      this.canvasContext.lineWidth = drawingEvent.lineWidth;
      if (drawingEvent.type === 'start') {
        this.canvasContext.beginPath();
        this.canvasContext.moveTo(drawingEvent.position.x, drawingEvent.position.y);
      } else if (drawingEvent.type === 'draw') {
        if (i > 0) {
          const prevEvent = drawingEvents[i - 1];
          this.canvasContext.quadraticCurveTo(
            prevEvent.position.x,
            prevEvent.position.y,
            drawingEvent.position.x,
            drawingEvent.position.y
          );
        } else {
          this.canvasContext.lineTo(drawingEvent.position.x, drawingEvent.position.y);
        }
        this.canvasContext.stroke();
      } else if (drawingEvent.type === 'stop') {
        this.canvasContext.closePath();
      }
    }
  }

  private subscribeToDrawingEvents() {
    if (this.lobbyId) {
      this.stompService.subscribeToDrawingEvents(this.lobbyId, (drawingEvents: any[]) => {
        if (!this.isDrawer) {
          this.processDrawingEvent(drawingEvents);
        }
      });
    }
  }

  private removeCanvasEventListeners() {
    const canvas = this.drawingCanvas.nativeElement;
    canvas.removeEventListener('mousedown', this.boundStartDrawing);
    canvas.removeEventListener('mousemove', this.boundDraw);
    canvas.removeEventListener('mouseup', this.boundStopDrawing);
    canvas.removeEventListener('mouseout', this.boundStopDrawing);
  }

  protected scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch(err) {
      console.error('Could not automatically scroll to bottom: ', err);
    }
  }

  private redirectToStartOnGameStartTimeOut() {
    setTimeout(() => {
      if (this.isWaitingForGameStart) {
        this.notificationService.showAsyncError('Game has not started in time. Redirecting to start...')
          .then(() => {
            this.router.navigate(['/']);
          });
      }
    }, 20000);
  }

  protected getAvatarUrl(playerName: string): string {
    const avatar = this.playerList.find(player => player.username === playerName)?.avatar;
    return `/assets/avatars/avatar-${avatar}.webp`;
  }

  protected getScoreClass(playerName: string): string {
    const scoresArray = [...this.scores.values()];
    const highestScore = Math.max(...scoresArray);
    const secondHighest = scoresArray.sort((a, b) => b - a)[1] || 0;
    const score = this.scores.get(playerName);

    if (score === highestScore) return 'gold-badge';
    if (score === secondHighest) return 'silver-badge';
    if (score === undefined || score < 0) return 'negative-score';
    return 'default-badge';
  }
}
