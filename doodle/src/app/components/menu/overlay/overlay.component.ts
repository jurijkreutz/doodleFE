import {Component, Output, EventEmitter, OnInit} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {HeartbeatService} from "../../../service/heartbeat.service";
import {NotificationService} from "../../../service/notification.service";
import {NgClass, NgOptimizedImage} from "@angular/common";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faArrowLeft, faArrowRight} from "@fortawesome/free-solid-svg-icons";

interface EmittedData {
  name: string;
  avatar: number;
}

@Component({
  selector: 'app-overlay',
  standalone: true,
  imports: [
    FormsModule,
    NgOptimizedImage,
    FaIconComponent,
    NgClass
  ],
  templateUrl: './overlay.component.html',
  styleUrl: './overlay.component.scss'
})
export class OverlayComponent implements OnInit {
  @Output() nameEntered = new EventEmitter<EmittedData>();
  protected userName: string = "";
  protected maxNameLength: number = 15;

  private readonly AVATAR_COUNT: number = 5;
  protected chosenAvatarNumber: number = 1;
  protected avatarPath: string = `assets/avatars/avatar-1.webp`;
  protected animationClass: string = '';

  private heartBeatService: HeartbeatService;
  private notificationService: NotificationService;

  constructor(heartBeatService: HeartbeatService, notificationService: NotificationService) {
    this.heartBeatService = heartBeatService;
    this.notificationService = notificationService;
  }

  ngOnInit() {
    this.heartBeatService.stopHeartbeat();
  }

  onNameEnter() {
    if (this.userName.trim().length > 0) {
      this.nameEntered.emit({name: this.userName, avatar: this.chosenAvatarNumber});
    } else {
      this.notificationService.showError('You need a name to play!');
    }
  }

  protected readonly faArrowRight = faArrowRight;
  protected readonly faArrowLeft = faArrowLeft;

  protected nextAvatar() {
    this.changeAvatar(true);
  }

  protected previousAvatar() {
    this.changeAvatar(false);
  }

  private changeAvatar(next: boolean) {
    this.animationClass = 'shrink';
    setTimeout(() => {
      this.chosenAvatarNumber = next
        ? this.chosenAvatarNumber === this.AVATAR_COUNT
          ? 1
          : this.chosenAvatarNumber + 1
        : this.chosenAvatarNumber === 1
          ? this.AVATAR_COUNT
          : this.chosenAvatarNumber - 1;
      this.avatarPath = `assets/avatars/avatar-${this.chosenAvatarNumber}.webp`;
      this.animationClass = 'grow';
      setTimeout(() => {
        this.animationClass = 'idle';
      }, 200);
    }, 200);
  }
}
