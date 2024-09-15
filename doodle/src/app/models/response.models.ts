export interface JoinLobbyResponse {
  id: string;
  players: string[];
}

export interface IsOwnerResponse {
  isOwner: boolean;
}

export interface WordToDraw {
  word: string;
}
