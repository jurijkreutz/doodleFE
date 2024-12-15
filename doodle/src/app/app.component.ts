import {Component, OnDestroy, OnInit} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {RestService} from "./service/api/rest.service";
import {NotificationComponent} from "./notification/notification.component";
import {HeartbeatService} from "./service/heartbeat.service";
import {filter} from "rxjs";
import {NgIf} from "@angular/common";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NotificationComponent, NgIf, FontAwesomeModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'doodle';
  isStart: boolean = false;

  constructor(private router: Router,
              private restService: RestService,
              private heartbeatService: HeartbeatService) { }

  ngOnInit(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
      // @ts-ignore
    ).subscribe((event: NavigationEnd) => {
      this.isStart = (event as NavigationEnd).url === '/menu' || (event as NavigationEnd).url === '/';
      console.log('isStart', this.isStart);
    });
  }

  ngOnDestroy(): void {
    this.heartbeatService.stopHeartbeat();
  }

}
