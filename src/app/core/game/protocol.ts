// Nachrichten zwischen Browser und WebSocket-Server. Wird von beiden Seiten importiert.
import type { MatchView } from './Match';
import type { PlayerControls } from './Player';

export const SERVER_PORT = 3000;

export interface LobbyPlayer {
  id: string;
  name: string;
  status: 'idle' | 'fighting';
}

// Browser -> Server
export type ClientMessage =
  | { type: 'join'; name: string }
  | { type: 'challenge'; to: string }
  | { type: 'cancelChallenge' }
  | { type: 'respond'; from: string; accept: boolean }
  | { type: 'input'; controls: PlayerControls }
  | { type: 'leaveMatch' };

// Server -> Browser
export type ServerMessage =
  | { type: 'welcome'; id: string; name: string }
  | { type: 'lobby'; players: LobbyPlayer[] }
  | { type: 'challenged'; from: LobbyPlayer }
  | { type: 'challengeCancelled'; from: string }
  | { type: 'challengeDeclined'; by: string }
  | { type: 'matchStart'; slot: 0 | 1; names: [string, string] }
  | { type: 'state'; view: MatchView }
  | { type: 'matchEnd'; reason: 'finished' | 'opponentLeft' };
