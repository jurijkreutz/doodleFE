import { Injectable } from '@angular/core';
import {Subject} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private errorSubject = new Subject<string>();
  error$ = this.errorSubject.asObservable();

  showError(message: string) {
    this.errorSubject.next(message);
    setTimeout(() => this.errorSubject.next(''), 5000);
  }

  async showAsyncError(message: string): Promise<void> {
    this.errorSubject.next(message);
    await new Promise(resolve => setTimeout(resolve, 5000));
    this.errorSubject.next('');
  }
}
