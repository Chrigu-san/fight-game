import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { MatchView } from '../game/Match';
import type { PlayerControls } from '../game/Player';
import {
  SERVER_PORT,
  type ClientMessage,
  type LobbyPlayer,
  type LobbyPosition,
  type ServerMessage,
} from '../game/protocol';

export type ConnectionStatus = 'offline' | 'connecting' | 'online' | 'error';

const NAME_KEY = 'fight-game.name';

@Injectable({ providedIn: 'root' })
export class Online {
  private zone = inject(NgZone);
  private router = inject(Router);
  private socket: WebSocket | null = null;

  status = signal<ConnectionStatus>('offline');
  myId = signal<string | null>(null);
  name = signal(loadName());
  players = signal<LobbyPlayer[]>([]);
  others = computed(() => this.players().filter((p) => p.id !== this.myId()));
  fighting = computed(() => this.others().filter((p) => p.status === 'fighting'));
  positions = signal<({ id: string } & LobbyPosition)[]>([]); // Ritter in der begehbaren Lobby
  spawnX = 0;

  incoming = signal<LobbyPlayer | null>(null); // wer mich gerade herausfordert
  outgoing = signal<string | null>(null); // wen ich herausgefordert habe (id)
  notice = signal('');

  inMatch = signal(false);
  slot = signal<0 | 1>(0);
  names = signal<[string, string]>(['', '']);
  matchView = signal<MatchView | null>(null);

  connect(name: string) {
    if (this.socket) return;
    const clean = name.trim();
    this.name.set(clean);
    saveName(clean);
    this.status.set('connecting');
    this.notice.set('');

    // Ausserhalb von Angular, damit nicht jede der 60 Nachrichten pro Sekunde die ganze App prüft; Signals aktualisieren die Anzeige trotzdem
    this.zone.runOutsideAngular(() => {
      const socket = new WebSocket(`ws://${location.hostname}:${SERVER_PORT}`);
      this.socket = socket;
      socket.onopen = () => this.send({ type: 'join', name: clean });
      socket.onmessage = (e) => this.onMessage(JSON.parse(e.data));
      // Nur reagieren, wenn es noch die aktuelle Verbindung ist (nicht nach disconnect())
      socket.onclose = () => {
        if (this.socket === socket) this.onClose();
      };
    });
  }

  disconnect() {
    const socket = this.socket;
    this.reset();
    this.status.set('offline');
    socket?.close();
  }

  challenge(id: string) {
    this.outgoing.set(id);
    this.notice.set('');
    this.send({ type: 'challenge', to: id });
  }

  cancelChallenge() {
    this.outgoing.set(null);
    this.send({ type: 'cancelChallenge' });
  }

  respond(accept: boolean) {
    const from = this.incoming();
    if (!from) return;
    this.incoming.set(null);
    this.send({ type: 'respond', from: from.id, accept });
  }

  sendLobbyMove(pos: LobbyPosition) {
    if (this.status() === 'online' && !this.inMatch()) this.send({ type: 'lobbyMove', ...pos });
  }

  sendInput(controls: PlayerControls) {
    if (this.inMatch()) this.send({ type: 'input', controls });
  }

  leaveMatch() {
    this.send({ type: 'leaveMatch' });
    this.endMatch('');
  }

  nameOf(id: string | null): string {
    return this.players().find((p) => p.id === id)?.name ?? '';
  }

  private onMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'welcome':
        this.myId.set(msg.id);
        this.name.set(msg.name);
        this.spawnX = msg.x;
        this.status.set('online');
        break;
      case 'lobby':
        this.players.set(msg.players);
        break;
      case 'lobbyState':
        this.positions.set(msg.positions);
        break;
      case 'challenged':
        this.incoming.set(msg.from);
        break;
      case 'challengeCancelled':
        if (this.incoming()?.id === msg.from) this.incoming.set(null);
        break;
      case 'challengeDeclined':
        this.outgoing.set(null);
        this.notice.set(`${msg.by} hat abgelehnt.`);
        break;
      case 'matchStart':
        this.incoming.set(null);
        this.outgoing.set(null);
        this.notice.set('');
        this.slot.set(msg.slot);
        this.names.set(msg.names);
        this.matchView.set(null);
        this.inMatch.set(true);
        this.zone.run(() => this.router.navigate(['/online']));
        break;
      case 'state':
        this.matchView.set(msg.view);
        break;
      case 'matchEnd':
        this.endMatch(msg.reason === 'opponentLeft' ? 'Dein Gegner hat den Kampf verlassen.' : '');
        break;
    }
  }

  private endMatch(notice: string) {
    if (!this.inMatch()) return;
    this.inMatch.set(false);
    this.matchView.set(null);
    this.notice.set(notice);
    this.zone.run(() => this.router.navigate(['/lobby']));
  }

  private onClose() {
    const wasConnected = this.status() === 'online';
    const wasInMatch = this.inMatch();
    this.reset();
    this.status.set('error');
    this.notice.set(
      wasConnected
        ? 'Die Verbindung zum Server ist abgebrochen.'
        : 'Server nicht erreichbar. Starte ihn mit "npm.cmd run server".',
    );
    if (wasInMatch) this.zone.run(() => this.router.navigate(['/lobby']));
  }

  private reset() {
    this.socket = null;
    this.myId.set(null);
    this.players.set([]);
    this.positions.set([]);
    this.incoming.set(null);
    this.outgoing.set(null);
    this.inMatch.set(false);
    this.matchView.set(null);
  }

  private send(msg: ClientMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(msg));
  }
}

function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // ohne localStorage wird der Name einfach nicht gemerkt
  }
}
