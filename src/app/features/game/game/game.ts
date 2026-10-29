import { Component, HostListener, NgZone, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Ground } from '../../../shared/components/ground/ground';
import { Healthbar } from '../../../shared/components/healthbar/healthbar';
import { Fighter, FighterColor } from '../../../shared/components/fighter/fighter';
import { GameState } from '../../../core/services/game-state';
import { Keyboard } from '../../../core/services/keyboard';
import { Online } from '../../../core/services/online';
import { Settings } from '../../../core/services/settings';
import { Match, STAGE_WIDTH } from '../../../core/game/Match';
import { KEYS_ONLINE, KEYS_P1, KEYS_P2, readControls } from '../../../core/game/controls';

const STEP = 1 / 60; // feste Schrittweite der Spiellogik
const SHAKE_TIME_MS = 180;

@Component({
  selector: 'app-game',
  imports: [Ground, Healthbar, Fighter],
  templateUrl: './game.html',
  styleUrl: './game.scss',
})
export class Game implements OnInit, OnDestroy {
  private zone = inject(NgZone);
  private router = inject(Router);
  private keyboard = inject(Keyboard);
  private state = inject(GameState);
  online = inject(Online);
  settings = inject(Settings);

  readonly mode: 'local' | 'online' = inject(ActivatedRoute).snapshot.data['mode'] ?? 'local';
  readonly stageWidth = STAGE_WIDTH;

  // Lokal rechnet der Browser selbst, online kommt der Spielstand vom Server
  private match = new Match();
  private localView = signal(this.match.toView());
  view = computed(() => (this.mode === 'online' ? (this.online.matchView() ?? this.localView()) : this.localView()));

  names = computed<[string, string]>(() =>
    this.mode === 'online' ? this.online.names() : ['Spieler 1', 'Spieler 2'],
  );
  floor = computed(() => this.state.groundY() + this.state.groundHeight());
  scale = signal(window.innerWidth / STAGE_WIDTH);
  fps = signal(0);
  shake = signal(false);

  private frameId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private lastHits = 0;
  private shakeTimeout?: ReturnType<typeof setTimeout>;

  fighterLabel(index: number): string {
    if (this.mode === 'local') return `P${index + 1}`;
    return this.online.slot() === index ? 'Du' : this.names()[index];
  }

  fighterColor(index: number): FighterColor {
    if (this.mode === 'online' && this.online.slot() === index) return 'me';
    return index === 0 ? 'p1' : 'p2';
  }

  ngOnInit() {
    if (this.mode === 'online' && !this.online.inMatch()) {
      this.router.navigate(['/lobby']);
      return;
    }
    this.keyboard.endFrame();
    // Ausserhalb von Angular, damit nicht jeder Frame die ganze Change Detection auslöst; die Signals aktualisieren die Anzeige trotzdem
    this.zone.runOutsideAngular(() => {
      this.lastTime = performance.now();
      this.frameId = requestAnimationFrame(this.loop);
    });
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.shakeTimeout);
  }

  @HostListener('window:resize')
  onResize() {
    this.scale.set(window.innerWidth / STAGE_WIDTH);
  }

  // Rechtsklick ist Blocken, nicht das Kontextmenü
  @HostListener('document:contextmenu', ['$event'])
  onContextMenu(event: MouseEvent) {
    event.preventDefault();
  }

  // Ist der Tab nicht sichtbar, soll die Figur online nicht weiterlaufen
  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (document.hidden && this.mode === 'online') {
      this.online.sendInput({ left: false, right: false, jump: false, attack: false, block: false, dash: false });
    }
  }

  private loop = (now: number) => {
    // Nach einem Tab-Wechsel nicht hunderte Schritte nachholen
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (this.mode === 'online') {
      this.onlineFrame();
    } else {
      this.localFrame(dt);
    }

    this.checkHits();
    if (dt > 0) this.fps.update((f) => Math.round(f * 0.9 + (1 / dt) * 0.1));
    this.frameId = requestAnimationFrame(this.loop);
  };

  private localFrame(dt: number) {
    this.accumulator += dt;
    while (this.accumulator >= STEP) {
      if (this.keyboard.wasPressed('Escape')) {
        this.zone.run(() => this.router.navigate(['/menu']));
      }
      const phase = this.match.getPhase();
      if ((phase === 'ko' || phase === 'timeout') && this.keyboard.wasPressed('Enter')) {
        this.match.reset();
      }
      this.match.update(STEP, readControls(this.keyboard, KEYS_P1), readControls(this.keyboard, KEYS_P2));
      this.keyboard.endFrame();
      this.accumulator -= STEP;
    }
    this.localView.set(this.match.toView());
  }

  // Online wird nur die Eingabe geschickt, gerechnet wird auf dem Server
  private onlineFrame() {
    if (this.keyboard.wasPressed('Escape')) {
      this.keyboard.endFrame();
      this.online.leaveMatch();
      return;
    }
    this.online.sendInput(readControls(this.keyboard, KEYS_ONLINE));
    this.keyboard.endFrame();
  }

  private checkHits() {
    const hits = this.view().hits;
    if (hits === this.lastHits) {
      return;
    }
    this.lastHits = hits;
    if (!this.settings.values().screenShake) {
      return;
    }
    this.shake.set(true);
    clearTimeout(this.shakeTimeout);
    this.shakeTimeout = setTimeout(() => this.shake.set(false), SHAKE_TIME_MS);
  }
}
