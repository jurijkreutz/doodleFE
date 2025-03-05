import {Component, OnDestroy, OnInit} from '@angular/core';
import {NavigationEnd, Router, RouterLink, RouterOutlet} from '@angular/router';
import {RestService} from "./service/api/rest.service";
import {NotificationComponent} from "./notification/notification.component";
import {HeartbeatService} from "./service/heartbeat.service";
import {filter} from "rxjs";
import {NgIf} from "@angular/common";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NotificationComponent, NgIf, FontAwesomeModule, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'doodle';
  isStart: boolean = false;
  isGame: boolean = false;
  isDesktop: boolean = window.innerWidth >= 1024;

  constructor(private router: Router,
              private restService: RestService,
              private heartbeatService: HeartbeatService) { }

  ngOnInit(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
      // @ts-ignore
    ).subscribe((event: NavigationEnd) => {
      this.isStart = (event as NavigationEnd).url === '/menu' || (event as NavigationEnd).url === '/';
      this.isGame = (event as NavigationEnd).url === '/game';
      if (this.isStart || this.isGame || !this.isDesktop) {
        document.body.classList.add('no-scroll');
      } else {
        document.body.classList.remove('no-scroll');
      }
    });
  }

  ngOnDestroy(): void {
    this.heartbeatService.stopHeartbeat();
  }

}
