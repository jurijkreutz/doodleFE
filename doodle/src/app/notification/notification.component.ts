import {Component, OnInit} from '@angular/core';
import {NotificationService} from "../service/notification.service";
import {NgIf} from "@angular/common";

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [
    NgIf
  ],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.scss'
})
export class NotificationComponent implements OnInit {
  message: string = '';

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.error$.subscribe((message) => {
      this.message = message;
    });
  }
}
