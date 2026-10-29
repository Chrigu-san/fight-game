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
    // Maustasten laufen über dieselben Sets, als "MouseLeft" und "MouseRight"
    window.addEventListener('mousedown', (e) => {
      const code = mouseCode(e.button);
      if (!code) return;
      this.pressed.add(code);
      this.held.add(code);
    });
    window.addEventListener('mouseup', (e) => {
      const code = mouseCode(e.button);
      if (code) this.held.delete(code);
    });
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

function mouseCode(button: number): string | null {
  return button === 0 ? 'MouseLeft' : button === 2 ? 'MouseRight' : null;
}
