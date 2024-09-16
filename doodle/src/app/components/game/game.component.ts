import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {NgForOf, NgIf} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {StompService} from "../../service/api/stomp.service";
import {WordOverlayComponent} from "./word-overlay/word-overlay.component";
import {WordToDraw} from "../../models/response.models";

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
    FormsModule,
    NgForOf,
    NgIf,
    WordOverlayComponent
  ],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent implements AfterViewInit{
  @ViewChild('drawingCanvas') drawingCanvas!: ElementRef<HTMLCanvasElement>;
  private canvasContext!: CanvasRenderingContext2D;
  private isDrawing = false;
  private sendInterval = 100; // ms
  private drawingEventsBuffer: any[] = [];

  lobbyId: string | null = null;
  messages: string[] = [];
  messageContent: string = '';
  isDrawer: boolean = false;
  wordToDraw: string = '';
  wordOverlayShown: boolean = false;
  wordInHeadShown: boolean = false;
  colors: string[] = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
  selectedColor: string = '#000000';

  private boundStartDrawing = this.startDrawing.bind(this);
  private boundDraw = this.draw.bind(this);
  private boundStopDrawing = this.stopDrawing.bind(this);

  constructor(private route: ActivatedRoute, private stompService: StompService) {
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
        console.log('New game state:', gameState);
        this.clearCanvas();
      });
      this.stompService.subscribeToGuessNotification(this.lobbyId, (guessEvaluation) => {
        this.messages.push(guessEvaluation.guessedCorrectly ?
          `Player ${guessEvaluation.userThatGuessed} guessed the word correctly! The word was ${guessEvaluation.word}` :
          `Player ${guessEvaluation.userThatGuessed} guessed the word: ${guessEvaluation.word}. It was incorrect.`);
        if (guessEvaluation.guessedCorrectly) {
          this.isDrawer = false;
          this.removeCanvasEventListeners();
          this.wordToDraw = '';
          this.wordOverlayShown = false;
          this.wordInHeadShown = false;
        }
      });
    }
  }

  private subscribeToWordChannel() {
    this.stompService.subscribeToWordChannel((word) => {
      this.prepareDrawingEnv(true);
      this.showWordToDraw(word);
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
    this.addDrawingEventToBuffer('stop', null); // Add to buffer
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

    for (const drawingEvent of drawingEvents) {
      this.canvasContext.strokeStyle = drawingEvent.color;
      this.canvasContext.lineWidth = drawingEvent.lineWidth;

      if (drawingEvent.type === 'start') {
        this.canvasContext.beginPath();
        this.canvasContext.moveTo(drawingEvent.position.x, drawingEvent.position.y);
      } else if (drawingEvent.type === 'draw') {
        this.canvasContext.lineTo(drawingEvent.position.x, drawingEvent.position.y);
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
}