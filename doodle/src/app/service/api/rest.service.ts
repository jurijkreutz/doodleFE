import { Injectable } from '@angular/core';
import {HttpClient, HttpErrorResponse, HttpParams} from "@angular/common/http";
import {catchError, Observable, throwError} from "rxjs";
import {JoinLobbyResponse} from "../../models/response.models";

@Injectable({
  providedIn: 'root'
})
export class RestService {
  private readonly REST_URL = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

  public sendInitializeSessionRequest(username: string): Observable<void> {
    const url = `${this.REST_URL}/session`;
    const params = new HttpParams().set('userName', username);
    const options = { params, withCredentials: true };
    return this.http.get<void>(url, options).pipe(
      catchError(this.handleError)
    );
  }

  public sendJoinLobbyRequest(lobbyId: string): Observable<JoinLobbyResponse> {
    const url = `${this.REST_URL}/lobby/join`;
    const params = new HttpParams().set('lobbyId', lobbyId);
    return this.http.post<JoinLobbyResponse>(url, {}, { params, withCredentials: true}).pipe(
      catchError(this.handleError)
    );
  }

  public sendCreateLobbyRequest(): Observable<JoinLobbyResponse> {
    const url = `${this.REST_URL}/lobby/create`;
    return this.http.post<any>(url, {}, { withCredentials: true }).pipe(
      catchError(this.handleError)
    );
  }

  public sendHeartbeatRequest(): Observable<void> {
    const url = `${this.REST_URL}/session/heartbeat`;
    return this.http.post<void>(url, {}, { withCredentials: true }).pipe(
      catchError(this.handleError)
    );

  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('RestService: Error occurred: ', error);
    return throwError(() => new Error(error.error.message));
  }
}
