import { Component, HostListener, NgZone, OnDestroy, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { Online } from '../../../core/services/online';
import { Keyboard } from '../../../core/services/keyboard';
import { GameState } from '../../../core/services/game-state';
import { Player } from '../../../core/game/Player';
import { STAGE_WIDTH } from '../../../core/game/Match';
import { KEYS_LOBBY, readControls } from '../../../core/game/controls';
import { Ground } from '../../../shared/components/ground/ground';
import { Fighter, FighterView } from '../../../shared/components/fighter/fighter';

const STEP = 1 / 60;
const SEND_INTERVAL = 0.05; // eigene Position 20x pro Sekunde schicken
const NEAR_DISTANCE = 150; // so nah muss man stehen, um jemanden herauszufordern
const SMOOTHING = 0.25; // wie schnell andere Ritter zur neuen Server-Position gleiten

interface OtherKnight extends FighterView {
  id: string;
  name: string;
}

@Component({
  selector: 'app-lobby',
  imports: [Ground, Fighter],
  templateUrl: './lobby.html',
  styleUrl: './lobby.scss',
})
export class Lobby implements OnDestroy {
  private router = inject(Router);
  private zone = inject(NgZone);
  private keyboard = inject(Keyboard);
  private state = inject(GameState);
  online = inject(Online);

  nameInput = signal(this.online.name());

  readonly stageWidth = STAGE_WIDTH;
  scale = signal(window.innerWidth / STAGE_WIDTH);
  floor = computed(() => this.state.groundY() + this.state.groundHeight());

  // Den eigenen Ritter rechnet der Browser selbst (gleiche Physik wie im Kampf), die anderen kommen vom Server
  private me = new Player(STAGE_WIDTH / 2, 'right');
  myView = signal<FighterView | null>(null);
  others = signal<OtherKnight[]>([]);
  nearId = signal<string | null>(null);
  nearName = computed(() => this.others().find((o) => o.id === this.nearId())?.name ?? '');

  private shown = new Map<string, { x: number; y: number }>();
  private frameId = 0;
  private running = false;
  private lastTime = 0;
  private accumulator = 0;
  private sendTimer = 0;
  private lastSent = '';

  constructor() {
    // Sobald die Verbindung steht, erscheint der eigene Ritter
    effect(() => {
      const online = this.online.status() === 'online';
      untracked(() => (online ? this.start() : this.stop()));
    });
  }

  ngOnDestroy() {
    this.stop();
  }

  @HostListener('window:resize')
  onResize() {
    this.scale.set(window.innerWidth / STAGE_WIDTH);
  }

  join(event?: Event) {
    event?.preventDefault();
    this.online.connect(this.nameInput());
  }

  back() {
    this.online.disconnect();
    this.router.navigate(['/menu']);
  }

  setName(event: Event) {
    this.nameInput.set((event.target as HTMLInputElement).value);
  }

  challengeNear() {
    const id = this.nearId();
    if (id && !this.online.outgoing() && !this.online.incoming()) this.online.challenge(id);
  }

  private start() {
    if (this.running) return;
    this.running = true;
    // Nach einem Kampf dort weitermachen, wo man vorher stand
    const known = this.online.positions().find((p) => p.id === this.online.myId());
    this.me.setDefaultPosX(known?.x ?? this.online.spawnX);
    this.me.resetPlayer();
    this.shown.clear();
    this.keyboard.endFrame();
    this.zone.runOutsideAngular(() => {
      this.lastTime = performance.now();
      this.frameId = requestAnimationFrame(this.loop);
    });
  }

  private stop() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
    this.myView.set(null);
    this.others.set([]);
    this.nearId.set(null);
  }

  private loop = (now: number) => {
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.accumulator += dt;

    while (this.accumulator >= STEP) {
      this.handleKeys();
      this.me.update(STEP, readControls(this.keyboard, KEYS_LOBBY), STAGE_WIDTH);
      this.keyboard.endFrame();
      this.accumulator -= STEP;
    }

    const mine = this.me.toView();
    const walking = Math.abs(this.me.getSpeedX()) > 40 && this.me.isOnGround();
    this.myView.set({ ...mine, walking });
    this.updateOthers(mine.x + mine.width / 2);
    this.sendPosition(dt, walking);

    if (this.running) this.frameId = requestAnimationFrame(this.loop);
  };

  private handleKeys() {
    if (this.keyboard.wasPressed('Escape')) {
      this.zone.run(() => this.back());
      return;
    }
    if (this.keyboard.wasPressed('KeyE')) {
      if (this.online.incoming()) this.online.respond(true);
      else this.challengeNear();
    }
    if (this.keyboard.wasPressed('KeyQ')) {
      if (this.online.incoming()) this.online.respond(false);
      else if (this.online.outgoing()) this.online.cancelChallenge();
    }
  }

  // Andere Ritter gleiten zur letzten Server-Position, damit es trotz 20 Updates pro Sekunde flüssig aussieht
  private updateOthers(myCenterX: number) {
    const myId = this.online.myId();
    const list: OtherKnight[] = [];
    const seen = new Set<string>();
    let nearest: { id: string; distance: number } | null = null;

    for (const pos of this.online.positions()) {
      if (pos.id === myId) continue;
      seen.add(pos.id);
      const shown = this.shown.get(pos.id) ?? { x: pos.x, y: pos.y };
      shown.x += (pos.x - shown.x) * SMOOTHING;
      shown.y += (pos.y - shown.y) * SMOOTHING;
      this.shown.set(pos.id, shown);

      list.push({
        id: pos.id,
        name: this.online.nameOf(pos.id),
        x: shown.x,
        y: shown.y,
        width: this.me.playerWidth,
        height: this.me.playerHeight,
        facing: pos.facing,
        walking: pos.moving,
      });

      const distance = Math.abs(shown.x + this.me.playerWidth / 2 - myCenterX);
      if (distance < NEAR_DISTANCE && (!nearest || distance < nearest.distance)) {
        nearest = { id: pos.id, distance };
      }
    }

    for (const id of this.shown.keys()) {
      if (!seen.has(id)) this.shown.delete(id);
    }
    this.others.set(list);
    this.nearId.set(nearest?.id ?? null);
  }

  private sendPosition(dt: number, walking: boolean) {
    this.sendTimer += dt;
    if (this.sendTimer < SEND_INTERVAL) return;
    this.sendTimer = 0;
    const pos = {
      x: Math.round(this.me.getPosX()),
      y: Math.round(this.me.getPosY()),
      facing: this.me.getFacing(),
      moving: walking,
    };
    const key = `${pos.x},${pos.y},${pos.facing},${pos.moving}`;
    if (key === this.lastSent) return;
    this.lastSent = key;
    this.online.sendLobbyMove(pos);
  }
}
