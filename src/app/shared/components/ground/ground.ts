import { Component, inject } from '@angular/core';
import { GameState } from '../../../core/services/game-state';

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
}
