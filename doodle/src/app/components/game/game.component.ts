import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {KeyValuePipe, NgForOf, NgIf} from "@angular/common";
import {ActivatedRoute, Router} from "@angular/router";
import {StompService} from "../../service/api/stomp.service";
import {WordOverlayComponent} from "./word-overlay/word-overlay.component";
import {WordToDraw} from "../../models/response.models";
import {NextRoundOverlayComponent} from "./next-round-overlay/next-round-overlay.component";
import {filter, Subject, take} from "rxjs";
import confetti from 'canvas-confetti';
import {NotificationService} from "../../service/notification.service";

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
    FormsModule,
    NgForOf,
    NgIf,
    WordOverlayComponent,
    NextRoundOverlayComponent,
    KeyValuePipe
  ],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent implements AfterViewInit{
  @ViewChild('drawingCanvas') drawingCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('scrollMe') myScrollContainer!: ElementRef;

  private canvasContext!: CanvasRenderingContext2D;
  private isDrawing = false;
  private sendInterval = 10; // ms
  private drawingEventsBuffer: any[] = [];

  lobbyId: string | null = null;
  messages: string[] = [];
  messageContent: string = '';

  isDrawer: boolean = false;
  wordToDraw: string = '';
  wordOverlayShown: boolean = false;
  wordInHeadShown: boolean = false;

  scores: Map<string, number> = new Map<string, number>();

  correctlyGuessedWord: string = '';
  userThatGuessed: string = '';
  nextDrawer: string = '';
  nextRoundScreenShown: boolean = false;
  isWaitingForServer: boolean = false;

  colors: string[] = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
  selectedColor: string = '#000000';

  private readonly NEXT_ROUND_SCREEN_DURAITON = 9000;
  private countdownInterval: any;

  private nextRoundScreenSubject = new Subject<boolean>();


  private boundStartDrawing = this.startDrawing.bind(this);
  private boundDraw = this.draw.bind(this);
  private boundStopDrawing = this.stopDrawing.bind(this);

  constructor(private route: ActivatedRoute,
              private stompService: StompService,
              private notificationService: NotificationService,
              private router: Router) {
    this.lobbyId = this.route.snapshot.paramMap.get('id');
  }

  ngAfterViewInit() {
    this.subscribeToGame();
    this.prepareDrawingEnv(false);
    this.subscribeToWordChannel();
    this.stompService.sendStartGame(this.lobbyId);
    this.initializeDrawingEventSender();
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
        this.clearCanvas();
        this.nextDrawer = gameState.drawerName;
        this.scores = gameState.playerScores;
        let roundTime: number = gameState.roundTime;
        this.handleCountdown(roundTime);
      });
      this.stompService.subscribeToGuessNotification(this.lobbyId, (guessEvaluation) => {
        this.isWaitingForServer = false;
        if (guessEvaluation.status == "correctly") {
          this.messages.push(`Player ${guessEvaluation.userThatGuessed} guessed the word correctly! The word was ${guessEvaluation.word}`);
        } else if (guessEvaluation.status == "incorrectly") {
          this.messages.push(`Player ${guessEvaluation.userThatGuessed} guessed the word: ${guessEvaluation.word}. It was incorrect.`);
        }
        if (guessEvaluation.status == "correctly") {
          this.handleCorrectGuess(guessEvaluation);
        } else if (guessEvaluation.status == "timeout") {
          this.showNextRoundScreen(guessEvaluation.word, `Oops! Time is up. The word was:`);
          this.resetEnvironment();
        }
        setTimeout(() => this.scrollToBottom(), 50);
      });
    }
  }

  private handleCountdown(roundTime: number) {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.countdownInterval = setInterval(() => {
      if (roundTime > 0) {
        console.log('Round time:', --roundTime);
      } else {
        this.isWaitingForServer = true;
        clearInterval(this.countdownInterval);
        console.log('Time is up!');
        this.handleServerTimeout();
      }
    }, 1000);
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
      this.nextDrawer = '';
    }, this.NEXT_ROUND_SCREEN_DURAITON);
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

  selectColor(color: string) {
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

  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch(err) {
      console.error('Could not automatically scroll to bottom: ', err);
    }
  }
}
