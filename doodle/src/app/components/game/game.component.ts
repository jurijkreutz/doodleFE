import {AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild} from '@angular/core';
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
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faCheck, faArrowPointer} from "@fortawesome/free-solid-svg-icons";
import {FillBucket} from "./utils/fill-bucket";
import {PodiumComponent} from "./podium/podium.component";

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
    NgClass,
    FaIconComponent,
    PodiumComponent
  ],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent implements AfterViewInit, OnDestroy{
  @ViewChild('drawingCanvas') drawingCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('scrollMe') myScrollContainer!: ElementRef;

  private canvasContext!: CanvasRenderingContext2D;
  private isDrawing = false;
  private lastSentSequence = 0;
  private receivedDrawingEvents: any[] = [];
  private sendTimerId: any = null;
  private currentStrokePoints: { x: number; y: number }[] = [];
  private lastSentIndex = 0;
  private partialStrokeTimerId: any = null;
  private isInStroke = false;
  private lastPoint: { x: number; y: number } | null = null;
  private currentStrokeId: string | null = null;
  private currentStrokeIdOnGuesser: string | null = null;

  // protected values for template binding
  protected maxGuessLength: number = 30;
  protected isWaitingForGameStart: boolean = true;
  protected isWaitingForDrawer: boolean = false;
  protected gameIsOver: boolean = false;
  protected messages: GameMessage[] = [];
  protected messageContent: string = '';
  protected isDrawer: boolean = false;
  protected wordToDraw: string = '';
  protected wordOverlayShown: boolean = false;
  protected wordInHeadShown: boolean = false;
  protected scores: Map<string, number> = new Map<string, number>();
  protected totalRounds: number = 0;
  protected remainingRounds: number = 100;
  protected correctlyGuessedWord: string = '';
  protected userThatGuessed: string = '';
  protected nextDrawer: string = '';
  protected nextRoundScreenShown: boolean = false;
  protected colors: string[] = ['#000000', '#ed7a70', '#FBBC04', '#fbee4e', '#b5fa61', '#78fadc', '#7cdcf1', '#bb7cf3'];

  private isOwner: boolean = false;
  private selectedSpeed: string = '';
  protected selectedRounds: number = 0;
  private lobbyId: string | null = null;
  protected playerList: Player[] = [];
  private isFirstRound: boolean = true;
  private isWaitingForServer: boolean = false;

  protected selectedColor: string = '#000000';
  protected currentTool: string = 'brush';

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
              private router: Router,
              private ngZone: NgZone) {
    this.lobbyId = this.route.snapshot.paramMap.get('id');
    this.isOwner = this.router.getCurrentNavigation()?.extras.state?.['isOwner']
    this.selectedSpeed = this.router.getCurrentNavigation()?.extras.state?.['speed'];
    this.selectedRounds = this.router.getCurrentNavigation()?.extras.state?.['rounds'];
    this.redirectToStartOnGameStartTimeOut();
  }

  ngAfterViewInit() {
    this.subscribeToGame();
    this.prepareDrawingEnv(false);
    this.subscribeToWordChannel();
    if (this.isOwner) {
      this.stompService.sendStartGame(this.lobbyId, this.selectedSpeed, this.selectedRounds);
    }
    this.partialStrokeTimerId = setInterval(() => {
      if (this.isDrawing && this.currentStrokePoints.length > 0) {
        this.sendPartialStrokeUpdate();
      }
    }, 1000 / 60);
  }

  ngOnDestroy() {
    this.clearTimeoutAndInterval();
    if (!this.gameIsOver) {
      this.removeCanvasEventListeners();
    }
    clearInterval(this.sendTimerId)
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
    if (this.totalRounds === 0) {
      this.totalRounds = gameState.remainingRounds;
    }
    this.remainingRounds = gameState.remainingRounds;
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
    if (this.remainingRounds === 0) {
      console.log('Game is over');
      this.handleGameFinish();
      return;
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
    this.resetDrawingEnvToCleanState();
    this.isDrawer = isDrawer;
    this.setupCanvas();
    this.subscribeToDrawingEvents();
  }

  private resetDrawingEnvToCleanState() {
    this.clearCanvas();
    this.isDrawing = false;
    if (this.canvasContext) {
      this.canvasContext.closePath();
    }
    this.currentTool = 'none';
  }

  private setupCanvas() {
    const canvas = this.drawingCanvas.nativeElement;
    this.canvasContext = canvas.getContext('2d')!;

    this.canvasContext.lineWidth = 5;
    this.canvasContext.lineCap = 'round';
    this.canvasContext.lineJoin = 'round';

    if (this.isDrawer) {
      // 1) pointerdown => setPointerCapture + startDrawing
      canvas.addEventListener('pointerdown', (e: PointerEvent) => {
        // ask the canvas to keep sending pointer events
        canvas.setPointerCapture(e.pointerId);
        this.startDrawing(e);
      });

      // 2) pointermove => only draw if isDrawing
      canvas.addEventListener('pointermove', (e: PointerEvent) => {
        if (this.isDrawing) {
          this.draw(e);
        }
      });

      // 3) pointerup => releasePointerCapture + stopDrawing
      canvas.addEventListener('pointerup', (e: PointerEvent) => {
        canvas.releasePointerCapture(e.pointerId);
        this.stopDrawing();
      });
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

    this.currentStrokeId = crypto.randomUUID?.() || Math.random().toString(36).substring(2);

    this.currentStrokePoints = [];
    const pos = this.getMousePosition(event);

    if (this.currentTool === 'fill') {
      FillBucket.floodFill(
        this.canvasContext,
        this.drawingCanvas.nativeElement,
        pos.x,
        pos.y,
        this.selectedColor);

      if (this.lobbyId) {
        const fillEvent = {
          type: 'fill',
          position: { x: pos.x, y: pos.y },
          color: this.selectedColor
        };
        this.stompService.sendDrawingEvents(this.lobbyId, [fillEvent]);
      }

      return;
    }

    this.isDrawing = true;
    this.currentStrokePoints.push(pos);
    this.canvasContext.beginPath();
    this.canvasContext.moveTo(pos.x, pos.y);
    this.canvasContext.strokeStyle = this.selectedColor;
  }

  private draw(event: MouseEvent) {
    if (!this.isDrawing || !this.isDrawer || this.currentTool === 'none') return;
    const pos = this.getMousePosition(event);
    this.canvasContext.lineTo(pos.x, pos.y);
    this.canvasContext.stroke();
    this.currentStrokePoints.push(pos);
  }

  private stopDrawing() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.canvasContext.closePath();

    // Final partial update for any leftover unsent points
    this.sendPartialStrokeUpdate();

    // Then send 'stop'
    if (this.lobbyId && this.currentStrokeId) {
      const stopEvent = { type: 'stop', strokeId: this.currentStrokeId };
      this.stompService.sendDrawingEvents(this.lobbyId, [stopEvent]);
      this.currentStrokeId = null;
    }

    // Now reset for the next stroke
    this.currentStrokePoints = [];
    this.lastSentIndex = 0;
  }

  private sendPartialStrokeUpdate() {
    if (!this.lobbyId) return;
    if (!this.currentStrokeId) return;
    if (this.currentStrokePoints.length <= this.lastSentIndex) return;

    // Extract only the *new* points since the last time we sent
    const newPoints = this.currentStrokePoints.slice(this.lastSentIndex);
    this.lastSentIndex = this.currentStrokePoints.length;
    // Now we've "caught up" to the end

    // Construct partial-stroke
    this.lastSentSequence++;
    const partialStrokeEvent = {
      type: 'partial-stroke',
      sequence: this.lastSentSequence,
      strokeId: this.currentStrokeId,
      points: newPoints,
      color: this.selectedColor,
      lineWidth: this.canvasContext.lineWidth
    };

    this.stompService.sendDrawingEvents(this.lobbyId, [partialStrokeEvent]);
  }

  protected selectColor(color: string) {
    if (this.selectedColor === '#ffffff') {
      this.currentTool = 'brush';
    }
    this.selectedColor = color;
  }

  protected selectEraser() {
    this.selectedColor = '#ffffff';
    this.currentTool = 'brush';
  }

  protected selectFillBucket() {
    if (this.selectedColor === '#ffffff') {
      this.selectedColor = '#000000';
    }
    this.currentTool = 'fill';
  }

  protected selectBrush() {
    if (this.selectedColor === '#ffffff') {
      this.selectedColor = '#000000';
    }
    this.currentTool = 'brush';
  }

  protected resetCanvas() {
    this.clearCanvas();
    if (this.lobbyId) {
      const clearEvent = { type: 'clear' };
      this.stompService.sendDrawingEvents(this.lobbyId, [clearEvent]);
    }
  }

  private processDrawingEvent(drawingEvents: any[]) {
    if (this.isDrawer) return;

    // Combine & sort everything by sequence:
    this.receivedDrawingEvents.push(...drawingEvents);
    this.receivedDrawingEvents.sort((a, b) => a.sequence - b.sequence);

    // Now apply them all at once in the correct order.
    // Using runOutsideAngular is optional but helps prevent performance hits:
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        while (this.receivedDrawingEvents.length) {
          const event = this.receivedDrawingEvents.shift();
          if (event) {
            this.applyDrawingEvent(event);
          }
        }
      });
    });
  }

  private async applyDrawingEvent(drawingEvent: any) {
    if (!this.canvasContext) {
      console.error('Canvas context is not initialized');
      return;
    }

    if (drawingEvent.type === 'clear') {
      this.clearCanvas();
      return;
    }

    if (drawingEvent.type === 'fill') {
      const { x, y } = drawingEvent.position!;
      FillBucket.floodFill(
        this.canvasContext,
        this.drawingCanvas.nativeElement,
        x,
        y,
        drawingEvent.color!
      );
      return;
    }

    this.canvasContext.strokeStyle = drawingEvent.color!;
    this.canvasContext.lineWidth = drawingEvent.lineWidth!;
    if (drawingEvent.type === 'partial-stroke') {
      const strokeId = drawingEvent.strokeId;

      // If we have no current stroke, or if this is a NEW strokeId,
      // then begin a new path
      if (!this.currentStrokeIdOnGuesser || this.currentStrokeIdOnGuesser !== strokeId) {
        // If we were already in a stroke, close it
        if (this.isInStroke) {
          this.canvasContext.closePath();
        }
        // Start new stroke
        this.isInStroke = true;
        this.currentStrokeIdOnGuesser = strokeId;
        this.canvasContext.beginPath();
        this.lastPoint = null;
      }

      // Now draw the points as usual
      drawingEvent.points.forEach((pt: { x: number; y: number }) => {
        if (!this.lastPoint) {
          this.canvasContext.moveTo(pt.x, pt.y);
        } else {
          this.canvasContext.lineTo(pt.x, pt.y);
          this.canvasContext.stroke();
        }
        this.lastPoint = pt;
      });
    }
    else if (drawingEvent.type === 'stop') {
      // If the strokeId matches the current stroke, let's close that path
      if (this.currentStrokeIdOnGuesser === drawingEvent.strokeId) {
        this.canvasContext.closePath();
        this.isInStroke = false;
        this.lastPoint = null;
        this.currentStrokeIdOnGuesser = null;
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
    canvas.removeEventListener('pointerdown', this.boundStartDrawing);
    canvas.removeEventListener('pointermove', this.boundDraw);
    canvas.removeEventListener('pointerup', this.boundStopDrawing);
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

  private handleGameFinish() {
    this.gameIsOver = true;
    this.clearTimeoutAndInterval();
  }

  protected routeBackToStart() {
    this.router.navigate(['/menu']);
  }

  protected readonly faCheck = faCheck;
  protected readonly faArrowPointer = faArrowPointer;
}
