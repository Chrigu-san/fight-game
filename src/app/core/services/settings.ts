import { Injectable, effect, signal } from '@angular/core';

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  showFps: boolean;
  screenShake: boolean;
}

const STORAGE_KEY = 'fight-game.settings';

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 80,
  musicVolume: 70,
  sfxVolume: 80,
  showFps: false,
  screenShake: true,
};

@Injectable({ providedIn: 'root' })
export class Settings {
  readonly values = signal<GameSettings>(this.load());

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values()));
      } catch {
        // localStorage nicht verfügbar (z.B. privates Fenster) – Einstellungen gelten nur für diese Sitzung
      }
    });
  }

  update<K extends keyof GameSettings>(key: K, value: GameSettings[K]) {
    this.values.update((s) => ({ ...s, [key]: value }));
  }

  reset() {
    this.values.set({ ...DEFAULT_SETTINGS });
  }

  private load(): GameSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }
}
