import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-healthbar',
  imports: [],
  templateUrl: './healthbar.html',
  styleUrl: './healthbar.scss',
})
export class Healthbar {
  name = input('');
  hp = input(100);
  maxHp = input(100);
  side = input<'left' | 'right'>('left');

  percent = computed(() => Math.max(0, Math.min(100, (this.hp() / this.maxHp()) * 100)));
  low = computed(() => this.percent() <= 25);
}
