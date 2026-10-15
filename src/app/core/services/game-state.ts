import { Injectable, signal, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GameState {
  router = inject(Router);
  groundY = signal(0);
  groundX = signal(0);
  groundHeight = signal(120);
  groundWidth = signal('100%');
  page = signal(this.router.url);

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => this.page.set(e.urlAfterRedirects));
  }
}
