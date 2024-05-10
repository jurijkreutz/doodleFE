import {Component, Output, EventEmitter} from '@angular/core';
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'app-overlay',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './overlay.component.html',
  styleUrl: './overlay.component.scss'
})
export class OverlayComponent {
  @Output() nameEntered = new EventEmitter<string>();
  userName: string = "";

  onNameEnter() {
    this.nameEntered.emit(this.userName);
  }

}
