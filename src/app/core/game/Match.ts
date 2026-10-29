// Eine 1v1-Runde: zwei Spieler, Treffer, Zeit und Sieger. Kein Angular, damit es später auch auf dem Server laufen kann.
import { Box, NO_CONTROLS, Player, PlayerControls, PlayerView } from './Player';

export type MatchPhase = 'countdown' | 'fight' | 'ko' | 'timeout';

export interface MatchView {
  players: [PlayerView, PlayerView];
  phase: MatchPhase;
  timeLeft: number;
  winner: 1 | 2 | null; // null bei Unentschieden oder solange gekämpft wird
  showFightBanner: boolean;
  hits: number; // Anzahl Treffer bisher, z.B. für Bildschirmwackeln
}

// Feste Breite der Arena in Spiel-Pixeln; die Anzeige skaliert sie auf die Fensterbreite
export const STAGE_WIDTH = 1280;

const ROUND_TIME = 99;
const COUNTDOWN_TIME = 1.2;
const FIGHT_BANNER_TIME = 0.8;
const KNOCKBACK_X = 380;
const KNOCKBACK_Y = 320;

export class Match {
  readonly players: [Player, Player];
  private phase: MatchPhase = 'countdown';
  private countdown = COUNTDOWN_TIME;
  private timeLeft = ROUND_TIME;
  private fightTime = 0;
  private winner: 1 | 2 | null = null;
  private hitCount = 0;

  private stageWidth: number;

  constructor(stageWidth = STAGE_WIDTH) {
    this.stageWidth = stageWidth;
    this.players = [new Player(0, 'right'), new Player(0, 'left')];
    this.reset();
  }

  reset() {
    this.updateSpawns();
    this.players.forEach((p) => p.resetPlayer());
    this.phase = 'countdown';
    this.countdown = COUNTDOWN_TIME;
    this.timeLeft = ROUND_TIME;
    this.fightTime = 0;
    this.winner = null;
  }

  setStageWidth(width: number) {
    this.stageWidth = width;
    this.updateSpawns();
    if (this.phase === 'countdown') {
      // Vor dem Kampf stehen beide immer auf ihren Startplätzen
      this.players.forEach((p) => p.resetPlayer());
    } else {
      this.players.forEach((p) => p.clampToStage(width));
    }
  }

  private updateSpawns() {
    const [p1, p2] = this.players;
    p1.setDefaultPosX(this.stageWidth * 0.25 - p1.playerWidth / 2);
    p2.setDefaultPosX(this.stageWidth * 0.75 - p2.playerWidth / 2);
  }

  // Zählt jeden Treffer, der Schaden gemacht hat (z.B. für Bildschirmwackeln)
  getHitCount(): number {
    return this.hitCount;
  }

  getPhase(): MatchPhase {
    return this.phase;
  }

  update(dt: number, controls1: PlayerControls, controls2: PlayerControls) {
    const fighting = this.phase === 'fight';
    const [p1, p2] = this.players;

    p1.update(dt, fighting ? controls1 : NO_CONTROLS, this.stageWidth);
    p2.update(dt, fighting ? controls2 : NO_CONTROLS, this.stageWidth);
    this.separate(p1, p2);

    if (this.phase === 'countdown') {
      this.countdown -= dt;
      if (this.countdown <= 0) this.phase = 'fight';
      return;
    }
    if (!fighting) {
      return;
    }

    this.fightTime += dt;
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    this.resolveAttack(p1, p2);
    this.resolveAttack(p2, p1);

    if (p1.isDead() || p2.isDead()) {
      this.phase = 'ko';
      this.winner = p1.isDead() && p2.isDead() ? null : p1.isDead() ? 2 : 1;
    } else if (this.timeLeft === 0) {
      this.phase = 'timeout';
      const hp1 = p1.getHp();
      const hp2 = p2.getHp();
      this.winner = hp1 === hp2 ? null : hp1 > hp2 ? 1 : 2;
    }
  }

  toView(): MatchView {
    return {
      players: [this.players[0].toView(), this.players[1].toView()],
      phase: this.phase,
      timeLeft: Math.ceil(this.timeLeft),
      winner: this.winner,
      showFightBanner: this.phase === 'fight' && this.fightTime < FIGHT_BANNER_TIME,
      hits: this.hitCount,
    };
  }

  private resolveAttack(attacker: Player, defender: Player) {
    const box = attacker.getAttackBox();
    if (!box || !overlaps(box, defender.getHitbox())) {
      return;
    }
    attacker.markAttackHit();
    const damaged = defender.isHit(attacker.getDamage(), KNOCKBACK_X, KNOCKBACK_Y, attacker.getFacing());
    if (damaged) this.hitCount++;
  }

  // Spieler können nicht durcheinander durchlaufen, nur drüber springen
  private separate(a: Player, b: Player) {
    const boxA = a.getHitbox();
    const boxB = b.getHitbox();
    const overlapX = Math.min(boxA.x + boxA.width, boxB.x + boxB.width) - Math.max(boxA.x, boxB.x);
    const overlapY = boxA.y < boxB.y + boxB.height * 0.6 && boxB.y < boxA.y + boxA.height * 0.6;
    if (overlapX <= 0 || !overlapY) {
      return;
    }
    const push = overlapX / 2;
    const aIsLeft = a.getCenterX() <= b.getCenterX();
    a.setPosX(a.getPosX() + (aIsLeft ? -push : push));
    b.setPosX(b.getPosX() + (aIsLeft ? push : -push));
    a.clampToStage(this.stageWidth);
    b.clampToStage(this.stageWidth);
  }
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}
