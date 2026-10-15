import { Component, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GameSettings, Settings } from '../../../core/services/settings';

type Panel = 'none' | 'settings' | 'terms' | 'quit';

interface MenuItem {
  label: string;
  action: () => void;
}

@Component({
  selector: 'app-menu',
  imports: [],
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
})
export class Menu {
  private router = inject(Router);
  settings = inject(Settings);

  panel = signal<Panel>('none');
  selected = signal(0);
  closeFailed = signal(false);

  readonly items: MenuItem[] = [
    { label: 'Spiel starten', action: () => this.router.navigate(['/game']) },
    { label: 'Einstellungen', action: () => this.panel.set('settings') },
    { label: 'Nutzungsbedingungen', action: () => this.panel.set('terms') },
    { label: 'Spiel beenden', action: () => this.panel.set('quit') },
  ];

  // Schwebende Lichtpartikel im Hintergrund (wie die Seelen-Funken in Hollow Knight)
  readonly particles = Array.from({ length: 28 }, () => ({
    left: Math.random() * 100,
    size: 2 + Math.random() * 4,
    duration: 10 + Math.random() * 14,
    delay: -Math.random() * 20,
    drift: (Math.random() - 0.5) * 120,
  }));

  select(index: number) {
    this.selected.set(index);
    this.items[index].action();
  }

  closePanel() {
    this.panel.set('none');
    this.closeFailed.set(false);
  }

  setVolume(key: keyof GameSettings, event: Event) {
    this.settings.update(key, Number((event.target as HTMLInputElement).value));
  }

  toggle(key: 'showFps' | 'screenShake') {
    this.settings.update(key, !this.settings.values()[key]);
  }

  quitGame() {
    window.close();
    // Browser erlauben window.close() nur für Fenster, die per Script geöffnet wurden
    setTimeout(() => this.closeFailed.set(true), 150);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent) {
    if (this.panel() !== 'none') {
      if (event.key === 'Escape') this.closePanel();
      return;
    }
    const count = this.items.length;
    switch (event.key) {
      case 'ArrowDown':
      case 's':
        this.selected.update((i) => (i + 1) % count);
        event.preventDefault();
        break;
      case 'ArrowUp':
      case 'w':
        this.selected.update((i) => (i - 1 + count) % count);
        event.preventDefault();
        break;
      case 'Enter':
        this.select(this.selected());
        event.preventDefault();
        break;
    }
  }
}
