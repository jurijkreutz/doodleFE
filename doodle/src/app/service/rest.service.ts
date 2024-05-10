import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from "@angular/common/http";
import {Observable} from "rxjs";
import {ErrorResponse, JoinLobbyResponse} from "../models/response.models";

@Injectable({
  providedIn: 'root'
})
export class RestService {
  private readonly REST_URL = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

  public sendInitializeSessionRequest(username: string): Observable<void> {
    const url = `${this.REST_URL}/session`;
    console.log(username);
    const params = new HttpParams().set('userName', username);
    const options = { params, withCredentials: true };
    return this.http.get<void>(url, options);
  }

  public sendJoinLobbyRequest(lobbyId: string): Observable<JoinLobbyResponse | ErrorResponse> {
    const url = `${this.REST_URL}/lobby/join`;
    const params = new HttpParams().set('lobbyId', lobbyId);
    return this.http.post<JoinLobbyResponse | ErrorResponse>(url, {}, { params, withCredentials: true});
  }
}
