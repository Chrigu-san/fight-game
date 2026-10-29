// WebSocket-Server: Lobby, Herausforderungen und die Online-Kämpfe.
// Der Server rechnet die Spiellogik (gleiche Klassen wie im Browser), die Browser schicken nur ihre Eingaben.
import { WebSocket, WebSocketServer } from 'ws';
import { Match } from '../src/app/core/game/Match';
import { NO_CONTROLS, type PlayerControls } from '../src/app/core/game/Player';
import {
  SERVER_PORT,
  type ClientMessage,
  type LobbyPlayer,
  type ServerMessage,
} from '../src/app/core/game/protocol';

const STEP = 1 / 60;
const END_DELAY = 4; // Sekunden nach K.O., bis beide zurück in der Lobby sind
const MAX_NAME_LENGTH = 16;

interface Client {
  id: string;
  name: string | null; // null, solange der Spieler der Lobby noch nicht beigetreten ist
  ws: WebSocket;
  challengeTo: string | null;
  room: Room | null;
}

interface Room {
  players: [Client, Client];
  match: Match;
  inputs: [PlayerControls, PlayerControls];
  endTimer: number;
}

const clients = new Map<string, Client>();
const rooms = new Set<Room>();
let nextId = 1;

const port = Number(process.env['PORT']) || SERVER_PORT;
const wss = new WebSocketServer({ port });
console.log(`Yahu Arena Server läuft auf ws://localhost:${port}`);

wss.on('connection', (ws) => {
  const client: Client = { id: String(nextId++), name: null, ws, challengeTo: null, room: null };
  clients.set(client.id, client);

  ws.on('message', (data) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }
    handle(client, msg);
  });
  ws.on('close', () => leave(client));
});

function handle(client: Client, msg: ClientMessage) {
  switch (msg.type) {
    case 'join': {
      client.name = cleanName(msg.name, client.id);
      send(client, { type: 'welcome', id: client.id, name: client.name });
      broadcastLobby();
      break;
    }
    case 'challenge': {
      const target = clients.get(msg.to);
      if (!client.name || client.room || !target || target === client || !target.name || target.room) {
        return;
      }
      cancelChallenge(client);
      client.challengeTo = target.id;
      send(target, { type: 'challenged', from: { id: client.id, name: client.name, status: 'idle' } });
      break;
    }
    case 'cancelChallenge':
      cancelChallenge(client);
      break;
    case 'respond': {
      const challenger = clients.get(msg.from);
      if (!challenger || challenger.challengeTo !== client.id) {
        return;
      }
      challenger.challengeTo = null;
      if (!msg.accept || client.room || challenger.room) {
        send(challenger, { type: 'challengeDeclined', by: client.name ?? '' });
        return;
      }
      startRoom(challenger, client);
      break;
    }
    case 'input': {
      const room = client.room;
      if (!room) return;
      const input = room.inputs[room.players.indexOf(client)];
      const c = msg.controls;
      input.left = !!c.left;
      input.right = !!c.right;
      input.block = !!c.block;
      // Einmal-Aktionen bleiben gesetzt, bis ein Spielschritt sie verarbeitet hat
      input.jump ||= !!c.jump;
      input.attack ||= !!c.attack;
      input.dash ||= !!c.dash;
      break;
    }
    case 'leaveMatch':
      if (client.room) endRoom(client.room, client);
      break;
  }
}

function startRoom(a: Client, b: Client) {
  cancelChallenge(a);
  cancelChallenge(b);
  // Wer einen der beiden herausgefordert hat, bekommt eine Absage
  for (const other of clients.values()) {
    if (other.challengeTo === a.id || other.challengeTo === b.id) {
      const target = other.challengeTo === a.id ? a : b;
      other.challengeTo = null;
      send(other, { type: 'challengeDeclined', by: target.name ?? '' });
    }
  }

  const room: Room = {
    players: [a, b],
    match: new Match(),
    inputs: [{ ...NO_CONTROLS }, { ...NO_CONTROLS }],
    endTimer: 0,
  };
  a.room = room;
  b.room = room;
  rooms.add(room);

  const names: [string, string] = [a.name ?? '', b.name ?? ''];
  send(a, { type: 'matchStart', slot: 0, names });
  send(b, { type: 'matchStart', slot: 1, names });
  broadcastLobby();
}

function endRoom(room: Room, leaver?: Client) {
  rooms.delete(room);
  for (const p of room.players) {
    p.room = null;
    if (p !== leaver) send(p, { type: 'matchEnd', reason: leaver ? 'opponentLeft' : 'finished' });
  }
  broadcastLobby();
}

function cancelChallenge(client: Client) {
  if (!client.challengeTo) return;
  const target = clients.get(client.challengeTo);
  client.challengeTo = null;
  if (target) send(target, { type: 'challengeCancelled', from: client.id });
}

function leave(client: Client) {
  cancelChallenge(client);
  for (const other of clients.values()) {
    if (other.challengeTo === client.id) {
      other.challengeTo = null;
      send(other, { type: 'challengeDeclined', by: client.name ?? '' });
    }
  }
  if (client.room) endRoom(client.room, client);
  clients.delete(client.id);
  broadcastLobby();
}

function cleanName(name: unknown, id: string): string {
  const clean = String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
  return clean || `Ritter ${id}`;
}

function lobbyPlayers(): LobbyPlayer[] {
  return [...clients.values()]
    .filter((c) => c.name)
    .map((c) => ({ id: c.id, name: c.name ?? '', status: c.room ? 'fighting' : 'idle' }));
}

function broadcastLobby() {
  const msg: ServerMessage = { type: 'lobby', players: lobbyPlayers() };
  for (const c of clients.values()) {
    if (c.name) send(c, msg);
  }
}

function send(client: Client, msg: ServerMessage) {
  if (client.ws.readyState === WebSocket.OPEN) client.ws.send(JSON.stringify(msg));
}

// Spielschleife mit fester Schrittweite; setInterval ist unter Windows ungenau, darum mit Zeitkonto
let last = performance.now();
let accumulator = 0;
setInterval(() => {
  const now = performance.now();
  accumulator += Math.min(0.25, (now - last) / 1000);
  last = now;
  let stepped = false;

  while (accumulator >= STEP) {
    accumulator -= STEP;
    stepped = true;
    for (const room of rooms) {
      const [c1, c2] = room.inputs;
      room.match.update(STEP, { ...c1 }, { ...c2 });
      for (const input of room.inputs) {
        input.jump = false;
        input.attack = false;
        input.dash = false;
      }
      const phase = room.match.getPhase();
      if (phase === 'ko' || phase === 'timeout') room.endTimer += STEP;
    }
  }
  if (!stepped) return;

  for (const room of rooms) {
    const msg: ServerMessage = { type: 'state', view: room.match.toView() };
    room.players.forEach((p) => send(p, msg));
    if (room.endTimer >= END_DELAY) endRoom(room);
  }
}, 4);
