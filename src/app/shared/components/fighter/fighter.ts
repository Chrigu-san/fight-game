import { Component, input } from '@angular/core';
import type { Facing } from '../../../core/game/Player';

// Alles, was zum Zeichnen eines Ritters nötig ist (Arena und Lobby)
export interface FighterView {
  x: number;
  y: number;
  width: number;
  height: number;
  facing: Facing;
  attacking?: boolean;
  blocking?: boolean;
  dashing?: boolean;
  hurt?: boolean;
  dead?: boolean;
  walking?: boolean;
}

export type FighterColor = 'p1' | 'p2' | 'me' | 'other';

@Component({
  selector: 'app-fighter',
  imports: [],
  templateUrl: './fighter.html',
  styleUrl: './fighter.scss',
  host: {
    '[style.left.px]': 'player().x',
    '[style.bottom.px]': 'player().y',
    '[style.width.px]': 'player().width',
    '[style.height.px]': 'player().height',
    '[style.--dir]': "player().facing === 'left' ? -1 : 1",
    '[class.attacking]': '!!player().attacking',
    '[class.blocking]': '!!player().blocking',
    '[class.dashing]': '!!player().dashing',
    '[class.hurt]': '!!player().hurt',
    '[class.dead]': '!!player().dead',
    '[class.walking]': '!!player().walking',
    '[class]': 'color()',
  },
})
export class Fighter {
  player = input.required<FighterView>();
  label = input('');
  color = input<FighterColor>('other');
}
