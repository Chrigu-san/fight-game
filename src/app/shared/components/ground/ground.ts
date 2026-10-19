import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { GameState } from '../../../core/services/game-state';

// Masse des Hintergrundbilds game-background.png und x-Positionen der Fackeln darin
const BG_WIDTH = 1774;
const BG_HEIGHT = 887;
const TORCH_X = [63, 577, 1090, 1600];

@Component({
  selector: 'app-ground',
  imports: [],
  templateUrl: './ground.html',
  styleUrl: './ground.scss',
})
export class Ground {
  state = inject(GameState);
  x = this.state.groundX();
  y = this.state.groundY();
  width = this.state.groundWidth();
  height = this.state.groundHeight();

  private viewport = signal({ w: window.innerWidth, h: window.innerHeight });

  // Das Hintergrundbild wird mit "cover" skaliert – gleiche Rechnung für Pixelgrösse und Fackelpositionen
  private bgScale = computed(() => {
    const { w, h } = this.viewport();
    return Math.max(w / BG_WIDTH, h / BG_HEIGHT);
  });

  // Ein Pixel im Hintergrundbild entspricht etwa 3 Bildpunkten
  pixel = computed(() => Math.max(2, Math.round(this.bgScale() * 3)));

  torches = computed(() => {
    const scale = this.bgScale();
    const offsetX = (this.viewport().w - BG_WIDTH * scale) / 2;
    return TORCH_X.map((tx, i) => ({
      left: offsetX + tx * scale - this.x,
      delay: i * -0.7,
    }));
  });

  // Aufsteigende Glutfunken nahe den Fackeln
  readonly embers = Array.from({ length: 6 }, (_, i) => ({
    offset: (i % 2 === 0 ? -1 : 1) * (20 + Math.random() * 70),
    duration: 3 + Math.random() * 3,
    delay: -Math.random() * 6,
  }));

  @HostListener('window:resize')
  onResize() {
    this.viewport.set({ w: window.innerWidth, h: window.innerHeight });
  }
}
