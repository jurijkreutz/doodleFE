import {Component, Input} from '@angular/core';
import {NgIf} from "@angular/common";

@Component({
  selector: 'app-next-round-overlay',
  standalone: true,
  imports: [
    NgIf
  ],
  templateUrl: './next-round-overlay.component.html',
  styleUrl: './next-round-overlay.component.scss'
})
export class NextRoundOverlayComponent {
  @Input() word: string = '';
  @Input() user: string = '';
  @Input() nextDrawer: string = '';
  @Input() gameIsOver: boolean = false;

}
