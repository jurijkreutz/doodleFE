import {Component, Input} from '@angular/core';
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'app-word-overlay',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './word-overlay.component.html',
  styleUrl: './word-overlay.component.scss'
})
export class WordOverlayComponent {
  @Input() word: string = '';

}
