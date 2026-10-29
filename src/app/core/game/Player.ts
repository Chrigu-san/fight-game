// Spieler-Logik ohne Angular: Position in Pixeln, Zeit in Sekunden.
// posY ist die Höhe über dem Boden (0 = steht auf dem Boden, nach oben positiv).

export type Facing = 'left' | 'right';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlayerControls {
  left: boolean;
  right: boolean;
  jump: boolean;
  attack: boolean;
  block: boolean;
  dash: boolean;
}

export const NO_CONTROLS: PlayerControls = {
  left: false,
  right: false,
  jump: false,
  attack: false,
  block: false,
  dash: false,
};

// Was die Anzeige (und später der Server) über einen Spieler wissen muss
export interface PlayerView {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  facing: Facing;
  attacking: boolean;
  attackBox: Box | null;
  blocking: boolean;
  dashing: boolean;
  dead: boolean;
  hurt: boolean;
}

const MAX_HP = 100;
const GRAVITY = 2600;
const MOVE_SPEED = 380;
const JUMP_SPEED = 950;
const DASH_SPEED = 1100;
const DASH_TIME = 0.15;
const DASH_COOLDOWN = 0.6;
const ATTACK_TIME = 0.35;
const ATTACK_ACTIVE_FROM = 0.08; // ab hier trifft der Schlag
const ATTACK_ACTIVE_TO = 0.22; // bis hier trifft der Schlag
const HITSTUN_TIME = 0.3; // so lange kann man nach einem Treffer nicht steuern
const HURT_FLASH_TIME = 0.15;

export class Player {
  readonly playerWidth = 64;
  readonly playerHeight = 180;
  private hp = MAX_HP;
  private posX: number;
  private posY = 0;
  private speedX = 0;
  private speedY = 0;
  private accelerationX = 0;
  private accelerationY = 0;
  private attacking = false;
  private dead = false;
  private dashing = false;
  private damage = 10;
  private attackRangeX = 70;
  private attackRangeY = 60;
  private attackingArea: Box = { x: 0, y: 0, width: 0, height: 0 };
  private blocking = false;
  private facing: Facing;

  private attackTimer = 0;
  private attackHasHit = false;
  private dashTimer = 0;
  private dashCooldown = 0;
  private hitstun = 0;
  private hurtFlash = 0;

  constructor(
    private defaultPosX: number,
    private readonly defaultFacing: Facing,
  ) {
    this.posX = defaultPosX;
    this.facing = defaultFacing;
  }

  setDefaultPosX(x: number) {
    this.defaultPosX = x;
  }

  resetPlayer() {
    this.setHp(MAX_HP);
    this.setDead(false);
    this.setPosX(this.defaultPosX);
    this.setPosY(0);
    this.setSpeedX(0);
    this.setSpeedY(0);
    this.setAccelerationX(0);
    this.setAccelerationY(0);
    this.setAttacking(false);
    this.setDashing(false);
    this.setDamage(10);
    this.setAttackRangeX(70);
    this.setAttackRangeY(60);
    this.setAttackingArea({ x: 0, y: 0, width: 0, height: 0 });
    this.setFacing(this.defaultFacing);
    this.setBlocking(false);
    this.attackTimer = 0;
    this.attackHasHit = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.hitstun = 0;
    this.hurtFlash = 0;
  }

  // Wird pro Spielschritt aufgerufen (60x pro Sekunde)
  update(dt: number, controls: PlayerControls, stageWidth: number) {
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.hitstun = Math.max(0, this.hitstun - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);

    const onGround = this.isOnGround();
    const canAct = !this.dead && this.hitstun === 0;
    const direction = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
    const inputFacing: Facing | null = direction < 0 ? 'left' : direction > 0 ? 'right' : null;

    if (canAct) {
      // Blickrichtung folgt der Laufrichtung, so kann man in beide Richtungen schlagen, blocken und dashen
      if (inputFacing && !this.attacking && !this.dashing) this.setFacing(inputFacing);
      this.setBlocking(controls.block && onGround && !this.attacking && !this.dashing);
      if (controls.attack && !this.blocking) this.hit();
      if (controls.jump && onGround && !this.blocking) this.jump();
      if (controls.dash && !this.blocking) this.dash(inputFacing ?? this.facing);
    } else {
      this.setBlocking(false);
    }

    if (this.dashing) {
      this.dashTimer -= dt;
      this.setAccelerationX(0);
      this.setAccelerationY(0);
      this.setSpeedY(0);
      if (this.dashTimer <= 0) {
        this.setDashing(false);
        this.setSpeedX(this.speedX * 0.3);
      }
    } else {
      const canMove = canAct && !this.blocking && !(this.attacking && onGround);
      const targetSpeed = canMove ? direction * MOVE_SPEED : 0;
      // In der Luft lässt sich weniger stark lenken als am Boden
      const grip = onGround ? 18 : 6;
      this.setAccelerationX((targetSpeed - this.speedX) * grip);
      this.setAccelerationY(-GRAVITY);
    }

    this.speedX += this.accelerationX * dt;
    this.speedY += this.accelerationY * dt;
    this.posX += this.speedX * dt;
    this.posY += this.speedY * dt;

    if (this.posY <= 0) {
      this.posY = 0;
      this.speedY = Math.max(0, this.speedY);
    }
    this.clampToStage(stageWidth);
    this.updateAttack(dt);
  }

  clampToStage(stageWidth: number) {
    const maxX = Math.max(0, stageWidth - this.playerWidth);
    if (this.posX < 0 || this.posX > maxX) {
      this.posX = Math.min(maxX, Math.max(0, this.posX));
      this.speedX = 0;
    }
  }

  takeDamage(damage: number) {
    if (this.isDead()) {
      return;
    }
    this.setHp(this.getHp() - damage); // setHp() setzt dead auf true, wenn hp 0 erreicht
  }

  hit() {
    if (this.isDead() || this.isAttacking()) {
      return;
    }
    this.setAttacking(true);
    this.attackTimer = 0;
    this.attackHasHit = false;
    this.updateAttackingArea();
  }

  block() {
    if (this.isBlocking() || this.isDead()) {
      return;
    }
    this.setBlocking(true);
  }

  jump() {
    if (this.isDead() || !this.isOnGround()) {
      return;
    }
    this.setSpeedY(JUMP_SPEED);
  }

  // Gibt zurück, ob der Treffer Schaden gemacht hat (false bei Block oder wenn schon tot)
  isHit(damage: number, knockbackX: number, knockbackY: number, direction: Facing): boolean {
    if (this.isDead()) {
      return false;
    }
    // Blocken hilft nur, wenn man den Angreifer anschaut
    const facingAttacker = this.facing !== direction;
    if (this.isBlocking() && facingAttacker) {
      this.takeKnockback(knockbackX * 0.4, 0, direction);
      return false;
    }
    this.takeDamage(damage);
    this.takeKnockback(knockbackX, knockbackY, direction);
    this.setAttacking(false);
    this.setDashing(false);
    this.hitstun = HITSTUN_TIME;
    this.hurtFlash = HURT_FLASH_TIME;
    return true;
  }

  takeKnockback(knockbackX: number, knockbackY: number, direction: Facing) {
    // direction ist einfach facing vom anderen Spieler
    if (direction === 'left') {
      this.setSpeedX(-knockbackX);
    } else {
      this.setSpeedX(knockbackX);
    }
    this.setSpeedY(knockbackY);
  }

  dash(direction: Facing = this.facing) {
    if (this.isDead() || this.isDashing() || this.dashCooldown > 0) {
      return;
    }
    this.setFacing(direction);
    this.setDashing(true);
    this.dashTimer = DASH_TIME;
    this.dashCooldown = DASH_COOLDOWN;
    this.setSpeedX(direction === 'left' ? -DASH_SPEED : DASH_SPEED);
  }

  // Trefferzone des Schlags, nur im aktiven Teil und nur bis zum ersten Treffer
  getAttackBox(): Box | null {
    const active =
      this.attacking &&
      !this.attackHasHit &&
      this.attackTimer >= ATTACK_ACTIVE_FROM &&
      this.attackTimer <= ATTACK_ACTIVE_TO;
    return active ? this.attackingArea : null;
  }

  markAttackHit() {
    this.attackHasHit = true;
  }

  getHitbox(): Box {
    return { x: this.posX, y: this.posY, width: this.playerWidth, height: this.playerHeight };
  }

  getCenterX(): number {
    return this.posX + this.playerWidth / 2;
  }

  isOnGround(): boolean {
    return this.posY <= 0;
  }

  toView(): PlayerView {
    return {
      x: this.posX,
      y: this.posY,
      width: this.playerWidth,
      height: this.playerHeight,
      hp: this.hp,
      maxHp: MAX_HP,
      facing: this.facing,
      attacking: this.attacking,
      attackBox: this.getAttackBox() ? { ...this.attackingArea } : null,
      blocking: this.blocking,
      dashing: this.dashing,
      dead: this.dead,
      hurt: this.hurtFlash > 0,
    };
  }

  private updateAttack(dt: number) {
    if (!this.attacking) {
      return;
    }
    this.attackTimer += dt;
    this.updateAttackingArea();
    if (this.attackTimer >= ATTACK_TIME) {
      this.setAttacking(false);
    }
  }

  private updateAttackingArea() {
    this.setAttackingArea({
      x: this.facing === 'right' ? this.posX + this.playerWidth : this.posX - this.attackRangeX,
      y: this.posY + this.playerHeight * 0.45,
      width: this.getAttackRangeX(),
      height: this.getAttackRangeY(),
    });
  }

  public setHp(hp: number) {
    this.hp = Math.max(0, hp);
    if (this.hp === 0) {
      this.setDead(true);
    }
  }
  public getHp(): number {
    return this.hp;
  }
  public getPosX(): number {
    return this.posX;
  }
  public setPosX(posX: number) {
    this.posX = posX;
  }
  public getPosY(): number {
    return this.posY;
  }
  public setPosY(posY: number) {
    this.posY = posY;
  }
  public getSpeedX(): number {
    return this.speedX;
  }
  public setSpeedX(speedX: number) {
    this.speedX = speedX;
  }
  public getSpeedY(): number {
    return this.speedY;
  }
  public setSpeedY(speedY: number) {
    this.speedY = speedY;
  }
  public getAccelerationX(): number {
    return this.accelerationX;
  }
  public setAccelerationX(accelerationX: number) {
    this.accelerationX = accelerationX;
  }
  public getAccelerationY(): number {
    return this.accelerationY;
  }
  public setAccelerationY(accelerationY: number) {
    this.accelerationY = accelerationY;
  }
  public isAttacking(): boolean {
    return this.attacking;
  }
  public setAttacking(attacking: boolean) {
    this.attacking = attacking;
  }
  public isDead(): boolean {
    return this.dead;
  }
  public setDead(dead: boolean) {
    this.dead = dead;
  }
  public isDashing(): boolean {
    return this.dashing;
  }
  public setDashing(dashing: boolean) {
    this.dashing = dashing;
  }
  public setDamage(damage: number) {
    this.damage = damage;
  }
  public getDamage(): number {
    return this.damage;
  }
  public setAttackRangeX(attackRangeX: number) {
    this.attackRangeX = attackRangeX;
  }
  public getAttackRangeX(): number {
    return this.attackRangeX;
  }
  public setAttackRangeY(attackRangeY: number) {
    this.attackRangeY = attackRangeY;
  }
  public getAttackRangeY(): number {
    return this.attackRangeY;
  }
  public setAttackingArea(attackingArea: Box) {
    this.attackingArea = attackingArea;
  }
  public getAttackingArea(): Box {
    return this.attackingArea;
  }
  public isBlocking(): boolean {
    return this.blocking;
  }
  public setBlocking(blocking: boolean) {
    this.blocking = blocking;
  }
  public getFacing(): Facing {
    return this.facing;
  }
  public setFacing(facing: Facing) {
    this.facing = facing;
  }
}
