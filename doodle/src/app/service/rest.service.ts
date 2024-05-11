import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from "@angular/common/http";
import {Observable} from "rxjs";
import {JoinLobbyResponse} from "../models/response.models";

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
    return this.http.get<void>(url, options);
  }

  public sendJoinLobbyRequest(lobbyId: string): Observable<JoinLobbyResponse> {
    const url = `${this.REST_URL}/lobby/join`;
    const params = new HttpParams().set('lobbyId', lobbyId);
    return this.http.post<JoinLobbyResponse>(url, {}, { params, withCredentials: true});
  }

  public sendCreateLobbyRequest(): Observable<JoinLobbyResponse> {
    const url = `${this.REST_URL}/lobby/create`;
    return this.http.post<any>(url, {}, { withCredentials: true });
  }
}
