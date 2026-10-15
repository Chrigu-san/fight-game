import { Routes } from '@angular/router';
import { Lobby } from './features/lobby/lobby/lobby';
import { Game } from './features/game/game/game';
import { Menu } from './features/menu/menu/menu';

export const routes: Routes = [
  { path: 'menu', component: Menu },
  {path: 'lobby', component: Lobby },
  { path: 'game', component: Game },
  { path: '**', redirectTo: 'menu' },
];