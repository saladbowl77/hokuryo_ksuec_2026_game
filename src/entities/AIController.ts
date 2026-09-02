import Phaser from 'phaser';
import type { Fighter } from './Fighter';
import type { FighterInput } from './FighterInput';

const ATTACK_RANGE = 140;

export class AIController {
  private attackCooldown = 0;
  private decisionTimer = 0;
  private wantBack = false;
  private wantJump = false;

  read(dt: number, self: Fighter, opponent: Fighter): FighterInput {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.decisionTimer -= dt;

    const dist = Math.abs(opponent.x - self.x);

    if (this.decisionTimer <= 0) {
      this.decisionTimer = Phaser.Math.Between(400, 900);
      this.wantBack = dist < 90 && Math.random() < 0.4;
      this.wantJump = Math.random() < 0.12;
    }

    const towardIsRight = opponent.x > self.x;
    let left = false;
    let right = false;

    if (dist > ATTACK_RANGE && !this.wantBack) {
      if (towardIsRight) right = true;
      else left = true;
    } else if (this.wantBack) {
      if (towardIsRight) left = true;
      else right = true;
    }

    let lightAttack = false;
    let heavyAttack = false;
    if (dist <= ATTACK_RANGE && this.attackCooldown <= 0) {
      lightAttack = Math.random() < 0.7;
      heavyAttack = !lightAttack;
      this.attackCooldown = Phaser.Math.Between(500, 1000);
    }

    const up = this.wantJump && this.decisionTimer > 0 && this.decisionTimer < 60;

    return { left, right, up, lightAttack, heavyAttack };
  }
}
