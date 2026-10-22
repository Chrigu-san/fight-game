import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GameSettings, Settings } from '../../../core/services/settings';

type Panel = 'none' | 'settings' | 'terms' | 'quit';
type SliderKey = 'masterVolume' | 'musicVolume' | 'sfxVolume';
type ToggleKey = 'showFps' | 'screenShake';

type Row =
  | { kind: 'slider'; label: string; key: SliderKey }
  | { kind: 'toggle'; label: string; key: ToggleKey }
  | { kind: 'action'; label: string; run: () => void };

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
  private lastMainIndex = 0;

  readonly items: MenuItem[] = [
    { label: 'Spiel starten', action: () => this.router.navigate(['/game']) },
    { label: 'Einstellungen', action: () => this.open('settings') },
    { label: 'Nutzungsbedingungen', action: () => this.open('terms') },
    { label: 'Spiel beenden', action: () => this.open('quit') },
  ];

  private readonly settingRows: Row[] = [
    { kind: 'slider', label: 'Gesamtlautstärke', key: 'masterVolume' },
    { kind: 'slider', label: 'Musik', key: 'musicVolume' },
    { kind: 'slider', label: 'Effekte', key: 'sfxVolume' },
    { kind: 'toggle', label: 'Bildschirmwackeln', key: 'screenShake' },
    { kind: 'toggle', label: 'FPS anzeigen', key: 'showFps' },
    { kind: 'action', label: 'Zurücksetzen', run: () => this.settings.reset() },
    { kind: 'action', label: 'Zurück', run: () => this.closePanel() },
  ];

  private readonly termsRows: Row[] = [
    { kind: 'action', label: 'Zurück', run: () => this.closePanel() },
  ];

  private readonly quitRows: Row[] = [
    { kind: 'action', label: 'Ja', run: () => this.quitGame() },
    { kind: 'action', label: 'Nein', run: () => this.closePanel() },
  ];

  // Einträge der geöffneten Unterseite
  rows = computed<Row[]>(() => {
    switch (this.panel()) {
      case 'settings':
        return this.settingRows;
      case 'terms':
        return this.termsRows;
      case 'quit':
        return this.quitRows;
      default:
        return [];
    }
  });

  heading = computed(() => {
    switch (this.panel()) {
      case 'settings':
        return 'Einstellungen';
      case 'terms':
        return 'Nutzungsbedingungen';
      case 'quit':
        return 'Spiel beenden?';
      default:
        return '';
    }
  });

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

  open(panel: Exclude<Panel, 'none'>) {
    this.lastMainIndex = this.selected();
    this.panel.set(panel);
    // Bei "Spiel beenden?" ist "Nein" vorausgewählt
    this.selected.set(panel === 'quit' ? 1 : 0);
  }

  closePanel() {
    this.panel.set('none');
    this.selected.set(this.lastMainIndex);
    this.closeFailed.set(false);
  }

  activate(index: number) {
    const row = this.rows()[index];
    if (row.kind === 'action') row.run();
    else if (row.kind === 'toggle') this.toggle(row.key);
  }

  adjust(index: number, direction: 1 | -1) {
    const row = this.rows()[index];
    if (row?.kind === 'slider') {
      const next = this.num(row.key) + direction * 5;
      this.settings.update(row.key, Math.min(100, Math.max(0, next)));
    } else if (row?.kind === 'toggle') {
      this.toggle(row.key);
    }
  }

  num(key: SliderKey): number {
    return this.settings.values()[key];
  }

  on(key: ToggleKey): boolean {
    return this.settings.values()[key];
  }

  setVolume(key: keyof GameSettings, event: Event) {
    this.settings.update(key, Number((event.target as HTMLInputElement).value));
  }

  toggle(key: ToggleKey) {
    this.settings.update(key, !this.settings.values()[key]);
  }

  quitGame() {
    window.close();
    // Browser erlauben window.close() nur für Fenster, die per Script geöffnet wurden
    setTimeout(() => this.closeFailed.set(true), 150);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent) {
    const inPanel = this.panel() !== 'none';
    const count = inPanel ? this.rows().length : this.items.length;

    switch (event.key) {
      case 'Escape':
        if (inPanel) this.closePanel();
        break;
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
      case 'ArrowLeft':
      case 'a':
        if (inPanel) this.adjust(this.selected(), -1);
        event.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
        if (inPanel) this.adjust(this.selected(), 1);
        event.preventDefault();
        break;
      case 'Enter':
        if (inPanel) this.activate(this.selected());
        else this.select(this.selected());
        event.preventDefault();
        break;
    }
  }
}
