
export class Player{
    private readonly defaultPosX = 67;
    private readonly defaultPosY = 67;
    private readonly playerWidth = 50;
    private readonly playerHeight = 50;
    private hp: number;
    private posX: number;
    private posY: number;
    private speedX: number;
    private speedY: number;
    private accelerationX: number;
    private accelerationY: number;
    private attacking: boolean;
    private dead: boolean;
    private dashing: boolean;
    private damage: number;
    private attackRangeX: number;
    private attackRangeY: number;
    private attackingArea: { x: number, y: number, width: number, height: number };
    private blocking: boolean;
    private facing: 'left' | 'right';

    constructor() {
        this.resetPlayer();
    }

    private resetPlayer() {
        this.setHp(100);
        this.setPosX(this.defaultPosX);
        this.setPosY(this.defaultPosY);
        this.setSpeedX(0);
        this.setSpeedY(0);
        this.setAccelerationX(0);
        this.setAccelerationY(0);
        this.setAttacking(false);
        this.setDead(false);
        this.setDashing(false);
        this.setDamage(10);
        this.setAttackRangeX(50);
        this.setAttackRangeY(50);
        this.setAttackingArea({ x: 0, y: 0, width: 0, height: 0 });
        this.setFacing('right');
        this.setBlocking(false);
    }

    takeDamage(damage: number) {
        if (this.isDead()) {
            return;
        }
        this.setHp(this.getHp() - damage); //setHp() ändert schon dead auf true yallah
    }

    hit() {
        if (this.isDead()) {
            return;
        }
        this.setAttacking(true);
        this.setAttackingArea({
            x: this.getPosX() + this.playerWidth,
            y: this.getPosY(),
            width: this.getAttackRangeX(),
            height: this.getAttackRangeY()
        });
    }

    block() {
        if (this.isBlocking() || this.isDead()) {
            return;
        }
        this.setBlocking(true);
    }

    jump() {
        if (this.isDead()) {
            return;
        }
        this.setAccelerationY(-10);
    }

    isHit(damage: number, knockbackX: number, knockbackY: number, direction: 'left' | 'right'): boolean {
        if (this.isAttacking() || this.isBlocking() || this.isDead()) {
            return false;
        }
        this.takeDamage(damage);
        this.takeKnockback(knockbackX, knockbackY, direction);
        return true;
    }

    takeKnockback(knockbackX: number, knockbackY: number, direction: 'left' | 'right') { //Direction ist einfach facing vom anderen Spieler
        if (this.isDead()) {
            return;
        }
        if (direction === 'left') {
            this.setSpeedX(-knockbackX);
        } else {
            this.setSpeedX(knockbackX);
        }
        this.setSpeedY(-knockbackY);
    }

    dash() {
        if (this.isDead()) {
            return;
        }
        this.setDashing(true);
        if (this.getFacing() === 'left') {
            this.setAccelerationX(-500);
        } else {
            this.setAccelerationX(500);
        }
    }

    public setHp(hp: number) {
        if (hp < 0) {
            this.hp = 0;
            this.setDead(true);
        }
        this.hp = hp;
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
    public setAttackingArea(attackingArea: { x: number, y: number, width: number, height: number }) {
        this.attackingArea = attackingArea;
    }
    public getAttackingArea(): { x: number, y: number, width: number, height: number } {
        return this.attackingArea;
    }
    public isBlocking(): boolean {
        return this.blocking;
    }
    public setBlocking(blocking: boolean) {
        this.blocking = blocking;
    }
    public getFacing(): 'left' | 'right' {
        return this.facing;
    }
    public setFacing(facing: 'left' | 'right') {
        this.facing = facing;
    }
}