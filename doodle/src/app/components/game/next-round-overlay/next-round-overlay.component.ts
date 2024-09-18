import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-next-round-overlay',
  standalone: true,
  imports: [],
  templateUrl: './next-round-overlay.component.html',
  styleUrl: './next-round-overlay.component.scss'
})
export class NextRoundOverlayComponent {
  @Input() word: string = '';
  @Input() user: string = '';
  @Input() nextDrawer: string = '';

}
