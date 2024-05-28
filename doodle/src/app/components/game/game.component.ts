import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {NgForOf, NgIf} from "@angular/common";
import {ActivatedRoute} from "@angular/router";
import {StompService} from "../../service/api/stomp.service";
import {RestService} from "../../service/api/rest.service";

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
    FormsModule,
    NgForOf,
    NgIf
  ],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss'
})
export class GameComponent implements OnInit{
  @ViewChild('drawingCanvas') drawingCanvas!: ElementRef<HTMLCanvasElement>;
  private canvasContext!: CanvasRenderingContext2D;
  private isDrawing = false;
  private sendInterval = 100; // ms
  private drawingEventsBuffer: any[] = [];

  lobbyId: string | null = null;
  messages: string[] = [];
  messageContent: string = '';
  isDrawer: boolean = false;
  colors: string[] = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
  selectedColor: string = '#000000';

  constructor(private route: ActivatedRoute, private stompService: StompService, private restService: RestService) {
    this.lobbyId = this.route.snapshot.paramMap.get('id');
  }

  ngOnInit() {
    this.subscribeToGame();
    if (this.lobbyId) {
      this.restService.sendIsOwnerRequest(this.lobbyId).subscribe((isOwner) => {
        this.setUserRole(isOwner.isOwner);
      });
    }
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
      });
      this.stompService.subscribeToGameNotifications(this.lobbyId, (notification) => {
        this.messages.push(notification);
        console.log('New game notification:', notification);
      });
    }
  }

  sendGuess() {
    if (this.lobbyId && this.messageContent.trim().length > 0) {
      this.stompService.sendGuess(this.lobbyId, this.messageContent);
      this.messageContent = '';
    }
  }

  private setUserRole(isOwner: boolean) {
    if (isOwner) {
      console.log('User is owner');
      this.isDrawer = true;
      this.setupCanvas();
    } else {
      console.log('User is not owner');
      this.setupCanvas();
      this.subscribeToDrawingEvents();
    }
  }

  private setupCanvas() {
    const canvas = this.drawingCanvas.nativeElement;
    this.canvasContext = canvas.getContext('2d')!;
    console.log('Canvas context:', this.canvasContext);

    this.canvasContext.lineWidth = 5;
    this.canvasContext.lineCap = 'round';

    if (this.isDrawer) {
      canvas.addEventListener('mousedown', this.startDrawing.bind(this));
      canvas.addEventListener('mousemove', this.draw.bind(this));
      canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
      canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
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
    console.log('Start drawing');
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
    console.log('Stop drawing');
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
        this.processDrawingEvent(drawingEvents);
      });
    }
  }
}
