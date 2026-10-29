import { Component, computed, inject } from '@angular/core';
import { GameState } from '../../../core/services/game-state';

@Component({
  selector: 'app-background',
  imports: [],
  templateUrl: './background.html',
  styleUrl: './background.scss',
})
export class Background {
  state = inject(GameState);
  backgroundImage = computed(() => this.getBackgroundImage(this.state.page()));

  getBackgroundImage(page: string): string {
    switch (page) {
      case '/menu':
        return 'url(/assets/images/backgrounds/menu-background.png)';
      case '/lobby':
        return 'url(/assets/images/backgrounds/menu-background.png)';
      case '/game':
      case '/online':
        return 'url(/assets/images/backgrounds/game-background.png)';
      default:
        return 'url(/assets/images/backgrounds/default-background.png)';
    }
  }
}
