import { Keyboard } from '../services/keyboard';
import { PlayerControls } from './Player';

// Tastenbelegung pro Spieler (KeyboardEvent.code, unabhängig vom Tastaturlayout)
export interface KeyMap {
  left: string[];
  right: string[];
  jump: string[];
  attack: string[];
  block: string[];
  dash: string[];
}

export const KEYS_P1: KeyMap = {
  left: ['KeyA'],
  right: ['KeyD'],
  jump: ['KeyW'],
  block: ['KeyS'],
  attack: ['KeyF'],
  dash: ['KeyG'],
};

// Auf der Schweizer Tastatur sind "Period" und "Slash" die Tasten . und -
export const KEYS_P2: KeyMap = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  jump: ['ArrowUp'],
  block: ['ArrowDown'],
  attack: ['Period', 'Numpad1'],
  dash: ['Slash', 'Numpad2'],
};

// Online spielt jeder an seinem eigenen PC, darum Maus für Schlag und Block
export const KEYS_ONLINE: KeyMap = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['KeyW', 'Space', 'ArrowUp'],
  block: ['MouseRight'],
  attack: ['MouseLeft'],
  dash: ['ShiftLeft', 'ShiftRight'],
};

// Laufen und Blocken zählen, solange die Taste gehalten wird; der Rest nur einmal pro Druck
export function readControls(keyboard: Keyboard, keys: KeyMap): PlayerControls {
  return {
    left: keyboard.isHeld(...keys.left),
    right: keyboard.isHeld(...keys.right),
    block: keyboard.isHeld(...keys.block),
    jump: keyboard.wasPressed(...keys.jump),
    attack: keyboard.wasPressed(...keys.attack),
    dash: keyboard.wasPressed(...keys.dash),
  };
}
