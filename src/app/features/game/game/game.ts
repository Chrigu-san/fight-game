import { Component, HostListener, NgZone, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Ground } from '../../../shared/components/ground/ground';
import { Healthbar } from '../../../shared/components/healthbar/healthbar';
import { GameState } from '../../../core/services/game-state';
import { Keyboard } from '../../../core/services/keyboard';
import { Settings } from '../../../core/services/settings';
import { Match } from '../../../core/game/Match';
import { KEYS_P1, KEYS_P2, readControls } from '../../../core/game/controls';

const STEP = 1 / 60; // feste Schrittweite der Spiellogik
const SHAKE_TIME_MS = 180;

@Component({
  selector: 'app-game',
  imports: [Ground, Healthbar],
  templateUrl: './game.html',
  styleUrl: './game.scss',
})
export class Game implements OnInit, OnDestroy {
  private zone = inject(NgZone);
  private router = inject(Router);
  private keyboard = inject(Keyboard);
  private state = inject(GameState);
  settings = inject(Settings);

  private match = new Match(window.innerWidth);

  // Die Spiellogik arbeitet mit normalen Klassen, die Anzeige bekommt pro Frame einen Schnappschuss als Signal
  view = signal(this.match.toView());
  floor = computed(() => this.state.groundY() + this.state.groundHeight());
  fps = signal(0);
  shake = signal(false);

  private frameId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private lastHitCount = 0;
  private shakeTimeout?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.match.setStageWidth(window.innerWidth);
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
    this.match.setStageWidth(window.innerWidth);
  }

  private loop = (now: number) => {
    // Nach einem Tab-Wechsel nicht hunderte Schritte nachholen
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.accumulator += dt;

    while (this.accumulator >= STEP) {
      this.handleMenuKeys();
      this.match.update(STEP, readControls(this.keyboard, KEYS_P1), readControls(this.keyboard, KEYS_P2));
      this.keyboard.endFrame();
      this.accumulator -= STEP;
    }

    this.checkHits();
    this.view.set(this.match.toView());
    if (dt > 0) this.fps.update((f) => Math.round(f * 0.9 + (1 / dt) * 0.1));
    this.frameId = requestAnimationFrame(this.loop);
  };

  private handleMenuKeys() {
    if (this.keyboard.wasPressed('Escape')) {
      this.zone.run(() => this.router.navigate(['/menu']));
      return;
    }
    const over = this.match.getPhase() === 'ko' || this.match.getPhase() === 'timeout';
    if (over && this.keyboard.wasPressed('Enter')) {
      this.match.reset();
    }
  }

  private checkHits() {
    const hits = this.match.getHitCount();
    if (hits === this.lastHitCount) {
      return;
    }
    this.lastHitCount = hits;
    if (!this.settings.values().screenShake) {
      return;
    }
    this.shake.set(true);
    clearTimeout(this.shakeTimeout);
    this.shakeTimeout = setTimeout(() => this.shake.set(false), SHAKE_TIME_MS);
  }
}
