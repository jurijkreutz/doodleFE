export interface JoinLobbyResponse {
  id: string;
  players: string[];
  rounds: string,
  speed: string
}

export interface IsOwnerResponse {
  isOwner: boolean;
}

export interface WordToDraw {
  word: string;
}

export interface Player {
  username: string,
  avatar: string
}

export interface DrawingEventDTO {
  type: string;
  sequence?: number;
  strokeId?: string;
  points?: { x: number; y: number }[];
  color?: string;
  lineWidth?: number;
  position?: { x: number, y: number };
}

export interface DrawerInfoResponse {
  isDrawer: boolean;
  wordToDraw: string | null;
}
