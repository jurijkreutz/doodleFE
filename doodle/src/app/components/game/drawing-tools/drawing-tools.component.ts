import {Component, EventEmitter, Input, Output} from '@angular/core';
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {NgForOf, NgIf} from "@angular/common";
import {faArrowPointer} from "@fortawesome/free-solid-svg-icons";
import {faCheck} from "@fortawesome/free-solid-svg-icons";

@Component({
  selector: 'app-drawing-tools',
  standalone: true,
  imports: [
    FaIconComponent,
    NgIf,
    NgForOf
  ],
  templateUrl: './drawing-tools.component.html',
  styleUrl: './drawing-tools.component.scss'
})
export class DrawingToolsComponent {
  @Input() colors: string[] = [];
  @Input() selectedColor: string = '';
  @Input() currentTool: string = '';

  @Output() colorSelected = new EventEmitter<string>();
  @Output() toolSelected = new EventEmitter<string>();
  @Output() canvasReset = new EventEmitter<void>();

  // Icons
  faCheck = faCheck;
  faArrowPointer = faArrowPointer;

  selectColor(color: string) {
    this.colorSelected.emit(color);
  }

  selectTool(tool: string) {
    this.toolSelected.emit(tool);
  }

  resetCanvas() {
    this.canvasReset.emit();
  }
}
