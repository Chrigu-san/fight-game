import { Injectable } from '@angular/core';

// Tasten, bei denen der Browser sonst scrollt
const BLOCK_DEFAULT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

@Injectable({ providedIn: 'root' })
export class Keyboard {
  private held = new Set<string>(); // gerade unten
  private pressed = new Set<string>(); // seit dem letzten endFrame() neu gedrückt

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (!e.repeat) this.pressed.add(e.code);
      this.held.add(e.code);
      if (BLOCK_DEFAULT.has(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    // Ohne das läuft eine Figur weiter, wenn man mit gehaltener Taste das Fenster wechselt
    window.addEventListener('blur', () => this.held.clear());
  }

  isHeld(...codes: string[]): boolean {
    return codes.some((c) => this.held.has(c));
  }

  wasPressed(...codes: string[]): boolean {
    return codes.some((c) => this.pressed.has(c));
  }

  // Nach jedem Spielschritt aufrufen, damit ein Druck nur einmal zählt
  endFrame() {
    this.pressed.clear();
  }
}
