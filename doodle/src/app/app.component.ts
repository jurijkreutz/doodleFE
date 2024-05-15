import {Component} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {RestService} from "./service/rest.service";
import {NotificationComponent} from "./notification/notification.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NotificationComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'doodle';

  constructor() {}

}
