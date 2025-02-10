import {AfterViewInit, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {KeyValuePipe, NgClass, NgForOf, NgIf, NgStyle} from "@angular/common";
import {ActivatedRoute, Router} from "@angular/router";
import {StompService} from "../../service/api/stomp.service";
import {WordOverlayComponent} from "./word-overlay/word-overlay.component";
import {DrawingEventDTO, Player, WordToDraw} from "../../models/response.models";
import {NextRoundOverlayComponent} from "./next-round-overlay/next-round-overlay.component";
import {catchError, filter, of, Subject, take, tap} from "rxjs";
import confetti from 'canvas-confetti';
import {NotificationService} from "../../service/notification.service";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faPaintBrush} from "@fortawesome/free-solid-svg-icons";
import {FillBucket} from "./utils/fill-bucket";
import {PodiumComponent} from "./podium/podium.component";
import {ScoreService} from "../../service/ingame/score/score.service";
import {GuessInfoService} from "../../service/ingame/guess-info/guess-info.service";
import {TimeCalculator} from "./utils/time-calculator";
import {ScoreClass} from "./utils/score-class";
import {DrawingToolsComponent} from "./drawing-tools/drawing-tools.component";
import {RestService} from "../../service/api/rest.service";
import {HeartbeatService} from "../../service/heartbeat.service";

export interface GameMessage {
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
    PodiumComponent,
    NgStyle,
    DrawingToolsComponent
  ],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent implements OnInit, AfterViewInit, OnDestroy{
  @ViewChild('drawingCanvas') drawingCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('scrollMe') myScrollContainer!: ElementRef;

  private canvasContext!: CanvasRenderingContext2D;
  private isDrawing = false;
  private hasDrawerWord: boolean = false;
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
  protected isResumingGameInProgress: boolean = false;
  private gameStartTimeoutId: any;

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
  protected totalRounds: number = 0;
  protected remainingRounds: number = 100;
  protected correctlyGuessedWord: string = '';
  protected userThatGuessed: string = '';
  protected nextDrawer: string = '';
  protected nextRoundScreenShown: boolean = false;
  protected colors: string[] = ['#000000', '#ed7a70', '#FBBC04', '#fbee4e', '#b5fa61', '#78fadc', '#7cdcf1', '#bb7cf3'];
  protected isResumedGame: boolean = false;

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
  private timePerDrawing: number | null = null;

  private nextRoundScreenSubject = new Subject<boolean>();

  private boundStartDrawing = this.startDrawing.bind(this);
  private boundDraw = this.draw.bind(this);
  private boundStopDrawing = this.stopDrawing.bind(this);

  constructor(private route: ActivatedRoute,
              private stompService: StompService,
              private restService: RestService,
              private notificationService: NotificationService,
              protected scoreService: ScoreService,
              protected guessInfoService: GuessInfoService,
              private heartBeatService: HeartbeatService,
              private router: Router,
              private ngZone: NgZone) {
    this.lobbyId = this.route.snapshot.paramMap.get('id');
    this.isOwner = this.router.getCurrentNavigation()?.extras.state?.['isOwner']
    this.selectedSpeed = this.router.getCurrentNavigation()?.extras.state?.['speed'];
    this.selectedRounds = this.router.getCurrentNavigation()?.extras.state?.['rounds'];
    this.redirectToStartOnGameStartTimeOut();
    const storedTotalRounds = localStorage.getItem('initialTotalRounds');
    if (storedTotalRounds) {
      this.totalRounds = parseInt(storedTotalRounds, 10);
    }
  }

  ngOnInit() {
    this.stompService.configureStomp();
    this.guessInfoService.messages$.subscribe((newMessages) => {
      this.messages.push(...newMessages);
      setTimeout(() => this.scrollToBottom(), 50);
    });
    this.guessInfoService.showNextRoundScreen$.subscribe((nextRoundScreen) => {
      this.showNextRoundScreen(nextRoundScreen.word, nextRoundScreen.message);
    });
    this.guessInfoService.resetEnvironment$.subscribe((triggerConfetti) => {
      if (triggerConfetti) {
        this.triggerConfetti();
      }
      this.resetEnvironment();
    });
  }

  private resumeGameState(): void {
    this.heartBeatService.startHeartbeat();
    if (this.lobbyId) {
      this.isResumedGame = true;
      this.isResumingGameInProgress = true;
      this.isWaitingForDrawer = false;
      this.prepareDrawingEnv(false, true);
      this.restService.getGameState(this.lobbyId).pipe(
        tap(response => {
          this.notificationService.showInfo('Resuming game...');
          this.updateLocalGameState(response, false);
        }),
        catchError(error => {
          console.error('Error fetching game state:', error);
          this.notificationService.showError('Failed to resume game state. Redirecting to start.');
          this.isResumingGameInProgress = false;
          this.isResumedGame = false;
          this.router.navigate(['/']);
          return of(null);
        })
      ).subscribe(gameStateResponse => {
        if (gameStateResponse) {
          this.restService.getDrawingHistory(this.lobbyId!).pipe(
            tap(drawingHistory => {
              console.log('Received drawing history:', drawingHistory);
              if (drawingHistory && drawingHistory.length > 0) {
                this.replayDrawingHistory(drawingHistory);
                this.isResumingGameInProgress = false;
              }
            }),
            catchError(error => {
              console.error('Error fetching drawing history:', error);
              this.prepareDrawingEnv(false, this.isResumedGame);
              return of([]);
            })
          ).subscribe(() => {
            this.checkIfUserIsDrawer();
            this.isResumingGameInProgress = false;
          });
        } else {
          this.isResumingGameInProgress = false;
          this.isResumedGame = false;
        }
      });
    }
  }

  private checkIfUserIsDrawer(): void {
    if (this.lobbyId) {
      this.restService.getDrawerInfo(this.lobbyId).pipe(
        catchError(error => {
          console.error('Error checking if user is drawer:', error);
          return of({ isDrawer: false, wordToDraw: null });
        })
      ).subscribe(response => {
        if (response && response.isDrawer) {
          console.log(response);
          this.isDrawer = true;
          this.wordToDraw = response.wordToDraw!;
          this.wordInHeadShown = true;
          this.prepareDrawingEnv(true, this.isResumedGame);
        } else {
          this.isDrawer = false;
          console.log('User is not the drawer.');
          this.prepareDrawingEnv(false, this.isResumedGame);
        }
      });
    }
  }


  ngAfterViewInit() {
    this.subscribeToDrawingHistory();
    this.subscribeToGame();
    const hasVisitedGame = localStorage.getItem('hasVisitedGame');
    if (hasVisitedGame === 'true') {
      this.resumeGameState();
    } else {
      localStorage.setItem('hasVisitedGame', 'true');
    }
    if (!this.isResumedGame) {
      this.prepareDrawingEnv(false, false);
    }
    this.subscribeToWordChannel();
    if (this.isOwner && !hasVisitedGame) {
      this.stompService.sendStartGame(this.lobbyId, this.selectedSpeed, this.selectedRounds);
    }
    this.partialStrokeTimerId = setInterval(() => {
      if (this.isDrawing && this.currentStrokePoints.length > 0) {
        this.sendPartialStrokeUpdate();
      }
    }, 1000 / 60);
  }

  ngOnDestroy() {
    if (this.gameStartTimeoutId) {
      clearTimeout(this.gameStartTimeoutId);
    }
    this.clearTimeoutAndInterval();
    if (!this.gameIsOver) {
      this.removeCanvasEventListeners();
    }
    clearInterval(this.sendTimerId)
  }

  private subscribeToDrawingHistory() {
    if (this.lobbyId) {
      this.stompService.subscribeToDrawingEventsHistory(this.lobbyId, (drawingHistory: DrawingEventDTO[]) => {
        if (drawingHistory && drawingHistory.length > 0) {
          this.replayDrawingHistory(drawingHistory);
        }
      });
    }
  }

  private replayDrawingHistory(drawingEvents: DrawingEventDTO[]) {
    drawingEvents.forEach(event => {
      this.applyDrawingEvent(event);
    });
  }

  private subscribeToGame() {
    if (this.lobbyId) {
      this.stompService.subscribeToGameState(this.lobbyId, (gameState) => {
        if (gameState) {
          this.isResumedGame = false;
          this.updateLocalGameState(gameState, true);
          this.clearCanvas();
        } else {
          this.isWaitingForGameStart = true;
        }
      });
      this.stompService.subscribeToGuessNotification(this.lobbyId, (guessEvaluation) => {
        this.isWaitingForServer = false;
        this.guessInfoService.handleGuessNotification(guessEvaluation);
      });
    }
  }

  private updateLocalGameState(gameState: any, isComingFromSubscription: boolean = false) {
    if (localStorage.getItem('initialTotalRounds') === null) {
      this.totalRounds = gameState.remainingRounds;
      localStorage.setItem('initialTotalRounds', gameState.remainingRounds.toString());
    } else {
      this.totalRounds = parseInt(localStorage.getItem('initialTotalRounds')!, 10);
    }
    this.drawingsInCurrentRound = gameState.currentDrawerIndex + 1;
    this.remainingRounds = gameState.remainingRounds;
    this.isWaitingForGameStart = false;
    this.nextDrawer = gameState.drawerName;
    this.playerList = gameState.players;
    this.scoreService.updatePlayerScores(gameState);
    this.updateRemainingDrawingsInRound(gameState.players);
    if (this.remainingRounds === 0) {
      this.handleGameFinish();
      return;
    }
    let roundTime: number = gameState.roundTime;
    this.handleCountdown(roundTime, isComingFromSubscription);
  }

  protected roundBoxColumns: number = 0;
  protected drawingsInCurrentRound: number = 0;

  private updateRemainingDrawingsInRound(playerList: Player[]) {
    this.roundBoxColumns = Math.ceil(Math.sqrt(playerList.length));
  }

  private handleCountdown(roundTime: number, isComingFromSubscription: boolean) {
    this.clearTimeoutAndInterval();
    let pureRoundTime: number;
    if (isComingFromSubscription) {
      pureRoundTime = TimeCalculator.calculatePureRoundTime(this.isFirstRound, roundTime, this.SCREEN_OVERLAY_DURATION_SECONDS);
    } else {
      pureRoundTime = roundTime;
    }
    const totalDuration = pureRoundTime;
    if (isComingFromSubscription) {
      this.timePerDrawing = totalDuration;
      localStorage.setItem('timePerDrawing', totalDuration.toString());
    } else {
      if (!this.timePerDrawing) {
        const stored = localStorage.getItem('timePerDrawing');
        if (stored) {
          this.timePerDrawing = parseFloat(stored);
        } else {
          this.timePerDrawing = roundTime;
        }
      }
    }
    const progressBar = document.getElementById('progress-bar') as HTMLElement;
    if (isComingFromSubscription) {
      this.resetProgressBar(progressBar, totalDuration);
    } else {
      this.resetProgressBar(progressBar, roundTime);
    }
    const screenOverlayWaitTime = TimeCalculator.calculateScreenOverlayWaitTime(this.isFirstRound, this.SCREEN_OVERLAY_DURATION_SECONDS);
    this.isFirstRound = false;
    if (!this.isResumedGame) {
      this.isWaitingForDrawer = true;
      this.countdownTimeout = setTimeout(() => {
        this.clearCanvas();
        this.pushNewDrawingChatMessage();
        this.startRoundTimer(pureRoundTime, progressBar);
        this.isWaitingForDrawer = false;
      }, screenOverlayWaitTime);
    } else {
      if (isComingFromSubscription) {
        this.isWaitingForDrawer = true;
        this.countdownTimeout = setTimeout(() => {
          this.clearCanvas();
          this.pushNewDrawingChatMessage();
          this.startRoundTimer(pureRoundTime, progressBar);
          this.isWaitingForDrawer = false;
        }, screenOverlayWaitTime);
      } else {
        this.isWaitingForDrawer = false;
        this.pushNewDrawingChatMessage();
        this.startRoundTimer(pureRoundTime, progressBar);
      }
    }
  }

  private startRoundTimer(remainingTime: number, progressBar: HTMLElement) {
    this.countdownInterval = setInterval(() => {
      if (remainingTime > 0) {
        remainingTime = this.countDownTime(remainingTime, progressBar);
      } else {
        this.waitForServerIfTimeIsUp();
      }
    }, 1000);
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

  private countDownTime(remainingTime: number, progressBar: HTMLElement) {
    remainingTime--;
    this.updateProgressBar(remainingTime, progressBar);
    return remainingTime;
  }

  private clearTimeoutAndInterval() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    if (this.countdownTimeout) {
      clearTimeout(this.countdownTimeout);
    }
  }

  private updateProgressBar(remainingTime: number, progressBar: HTMLElement) {
    const progressPercentage = Math.min((remainingTime / this.timePerDrawing!) * 100, 100);
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
    // console.log('Remaining time:', remainingTime);
  }

  private resetProgressBar(progressBar: HTMLElement, remainingTime: number) {
    if (progressBar && this.timePerDrawing) {
      const progressPercentage = (remainingTime / this.timePerDrawing) * 100;
      progressBar.style.width = `${progressPercentage}%`;
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

  private resetEnvironment() {
    this.isDrawer = false;
    this.removeCanvasEventListeners();
    this.wordToDraw = '';
    this.wordOverlayShown = false;
    this.wordInHeadShown = false;
    this.hasDrawerWord = false;
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
      if (this.hasDrawerWord) {
        console.log("Ignoring duplicate word message");
        return;
      }
      this.hasDrawerWord = true;
      if (!this.nextRoundScreenShown) {
        this.prepareDrawingEnv(true, this.isResumedGame);
        this.showWordToDraw(word);
      } else {
        this.waitForNextRoundScreenToClose().then(() => {
          this.prepareDrawingEnv(true, this.isResumedGame);
          this.showWordToDraw(word);
        });
      }
      if (this.lobbyId) {
        this.stompService.sendDrawerAck(this.lobbyId);
      }
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

  private prepareDrawingEnv(isDrawer: boolean, isResumedGame: boolean) {
    if (!isDrawer) {
      this.removeCanvasEventListeners();
    }
    this.resetDrawingEnvToCleanState(isResumedGame);
    this.isDrawer = isDrawer;
    this.setupCanvas();
    this.subscribeToDrawingEvents();
  }

  private resetDrawingEnvToCleanState(isResumedGame: boolean) {
    if (!isResumedGame) {
      this.clearCanvas();
    }
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
      if (!this.isResumedGame) {
        this.resetCanvas();
      }
      canvas.addEventListener('pointerdown', (e: PointerEvent) => {
        canvas.setPointerCapture(e.pointerId);
        this.startDrawing(e);
      });
      canvas.addEventListener('pointermove', (e: PointerEvent) => {
        if (this.isDrawing) {
          this.draw(e);
        }
      });
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
    this.sendPartialStrokeUpdate();
    if (this.lobbyId && this.currentStrokeId) {
      const stopEvent = { type: 'stop', strokeId: this.currentStrokeId };
      this.stompService.sendDrawingEvents(this.lobbyId, [stopEvent]);
      this.currentStrokeId = null;
    }
    this.currentStrokePoints = [];
    this.lastSentIndex = 0;
  }

  private sendPartialStrokeUpdate() {
    if (!this.lobbyId) return;
    if (!this.currentStrokeId) return;
    if (this.currentStrokePoints.length <= this.lastSentIndex) return;
    const newPoints = this.currentStrokePoints.slice(this.lastSentIndex);
    this.lastSentIndex = this.currentStrokePoints.length;
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

  protected onToolSelected(tool: string) {
    switch(tool) {
      case 'brush': this.selectBrush(); break;
      case 'fill': this.selectFillBucket(); break;
      case 'eraser': this.selectEraser(); break;
    }
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
    this.receivedDrawingEvents.push(...drawingEvents);
    this.receivedDrawingEvents.sort((a, b) => a.sequence - b.sequence);

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

      if (!this.currentStrokeIdOnGuesser || this.currentStrokeIdOnGuesser !== strokeId) {
        if (this.isInStroke) {
          this.canvasContext.closePath();
        }
        this.isInStroke = true;
        this.currentStrokeIdOnGuesser = strokeId;
        this.canvasContext.beginPath();
        this.lastPoint = null;
      }
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
    this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
  }

  private redirectToStartOnGameStartTimeOut() {
    this.gameStartTimeoutId = setTimeout(() => {
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

  private handleGameFinish() {
    this.gameIsOver = true;
    this.clearTimeoutAndInterval();
  }

  protected routeBackToStart() {
    this.router.navigate(['/menu']);
  }

  protected readonly faPaintBrush = faPaintBrush;
  protected readonly ScoreClass = ScoreClass;
}
