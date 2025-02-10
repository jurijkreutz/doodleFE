import { Injectable } from '@angular/core';
import {HttpClient, HttpErrorResponse, HttpHeaders, HttpParams} from "@angular/common/http";
import {catchError, Observable, tap, throwError} from "rxjs";
import {DrawerInfoResponse, IsOwnerResponse, JoinLobbyResponse} from "../../models/response.models";
import {environment} from "../../../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class RestService {
  private readonly REST_URL = environment.REST_URL;
  private sessionId: string | null = null;

  constructor(private http: HttpClient) {
    this.loadSessionId();
  }

  private loadSessionId(): void {
    this.sessionId = localStorage.getItem('sessionId');
  }

  private getHeaders(): HttpHeaders {
    if (!this.sessionId) {
      this.loadSessionId();
    }
    return new HttpHeaders({
      'X-Session-ID': this.sessionId || ''
    });
  }


  public sendInitializeSessionRequest(username: string, avatar: number): Observable<{ sessionId: string }> {
    const url = `${this.REST_URL}/session`;
    const params = new HttpParams()
      .set('userName', username)
      .set('avatar', avatar.toString());

    return this.http.get<{ sessionId: string }>(url, { params }).pipe(
      tap(response => {
        this.sessionId = response.sessionId;
        localStorage.setItem('sessionId', response.sessionId);
      }),
      catchError(this.handleError)
    );
  }

  public sendJoinLobbyRequest(lobbyId: string): Observable<JoinLobbyResponse> {
    const url = `${this.REST_URL}/lobby/join`;
    const params = new HttpParams().set('lobbyId', lobbyId);
    return this.http.post<JoinLobbyResponse>(url, {}, {
      params,
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  public sendCreateLobbyRequest(): Observable<JoinLobbyResponse> {
    const url = `${this.REST_URL}/lobby/create`;
    return this.http.post<JoinLobbyResponse>(url, {}, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  public sendIsOwnerRequest(lobbyId: string): Observable<IsOwnerResponse> {
    const url = `${this.REST_URL}/lobby/isOwner`;
    const params = new HttpParams().set('lobbyId', lobbyId);
    return this.http.get<IsOwnerResponse>(url, {
      params,
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  public sendHeartbeatRequest(): Observable<void> {
    const url = `${this.REST_URL}/session/heartbeat`;
    return this.http.post<void>(url, {}, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  public getGameState(lobbyId: string): Observable<any> {
    const url = `${this.REST_URL}/game/state`;
    const params = new HttpParams().set('lobbyId', lobbyId);
    return this.http.get<any>(url, { params, headers: this.getHeaders() });
  }

  public getDrawingHistory(lobbyId: string): Observable<any[]> {
    const url = `${this.REST_URL}/game/drawingHistory`;
    const params = new HttpParams().set('lobbyId', lobbyId);
    return this.http.get<any[]>(url, { params, headers: this.getHeaders() });
  }

  public getDrawerInfo(lobbyId: string): Observable<DrawerInfoResponse> {
    const url = `${this.REST_URL}/game/drawer`;
    const params = new HttpParams().set('lobbyId', lobbyId);
    return this.http.get<DrawerInfoResponse>(url, { params, headers: this.getHeaders() });
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('RestService: Error occurred: ', error);
    if (error.status === 401) {
      localStorage.removeItem('sessionId');
    }
    return throwError(() => new Error(error.error?.message || 'Unknown error occurred'));
  }
}
