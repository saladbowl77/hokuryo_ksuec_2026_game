import Phaser from 'phaser';
import type { CharacterDef, PoseName } from '../data/characters';
import { poseKey, POSE_SCALE_CORRECTION } from '../data/characters';
import type { FighterInput } from './FighterInput';

export type FighterState = 'idle' | 'walk' | 'jump' | 'attack' | 'hitstun' | 'guard' | 'ko';
type AttackPhase = 'startup' | 'active' | 'recovery' | null;

// Velocities stay in px/second — Phaser's Arcade physics integrates them, and
// with fixedStep physics at 60fps that is already deterministic. Everything
// that counts down (attack phases, hitstun, pose timers) is in FRAMES.
const MOVE_SPEED = 340;
const JUMP_VY = -1400;
const JUMP_VX = 340;
const GUARD_FLASH_F = 9; // ~150ms — brief blue tint on a successful guard
const HITSTUN_F = 23; // ~380ms
const HIT_POSE1_F = 9; // ~150ms — initial snap-back pose before the deeper recoil
const MAX_HP = 100;
const IDLE_POSE_SWITCH_F = 19; // ~320ms per idle breathing frame
const WALK_POSE_SWITCH_F = 8; // ~130ms per walk frame
const KO_FRAME_F = 8; // ~130ms per knockdown frame
const IDLE_POSES: PoseName[] = ['idle1', 'idle2', 'idle3', 'idle4'];
const KO_POSES: PoseName[] = ['down1', 'down2', 'down3', 'down4', 'down5', 'down6'];
/** Knockback per melee hit, as a fraction of screen width (spec: 1/10; tuned
 * down to keep the 2-hit auto-chain combo actually reachable). */
const KNOCKBACK_SCREEN_RATIO = 0.02;

interface AttackDef {
  /** frames before the hitbox appears */
  startup: number;
  /** frames the hitbox stays live */
  active: number;
  /** frames of recovery after the hitbox is gone */
  recovery: number;
  damage: number;
  /** hitbox width in px, measured forward from the fighter's centre */
  rangeX: number;
  rangeY: number;
  offsetY: number;
  next?: Partial<Record<'light' | 'heavy', string>>;
}

// Frame data (60fps). Old millisecond values kept in comments for reference.
const ATTACKS: Record<string, AttackDef> = {
  light1: {
    startup: 5, // 90ms
    active: 5, // 90ms
    recovery: 12, // 200ms
    damage: 10,
    rangeX: 100,
    rangeY: 90,
    offsetY: -140,
    next: { light: 'light2' },
  },
  light2: {
    startup: 6, // 100ms
    active: 5, // 90ms
    recovery: 13, // 220ms
    damage: 10,
    rangeX: 105,
    rangeY: 90,
    offsetY: -140,
    next: { heavy: 'heavy1' },
  },
  heavy1: {
    startup: 9, // 150ms
    active: 7, // 120ms
    recovery: 19, // 320ms
    damage: 10,
    rangeX: 130,
    rangeY: 100,
    offsetY: -150,
  },
};

export class Fighter extends Phaser.Physics.Arcade.Sprite {
  hp = MAX_HP;
  facing: 1 | -1 = 1;
  state: FighterState = 'idle';
  isBacking = false;

  readonly def: CharacterDef;
  /** Display width of the standing pose, fixed at spawn — used for spacing
   * (push-apart) so a wide attack pose (e.g. an extended punch) doesn't
   * momentarily inflate the required gap and shove the opponent out of range. */
  readonly baseWidth: number;
  private readonly baseScale: number;
  private readonly stageWidth: number;

  private attackKey: string | null = null;
  private attackPhase: AttackPhase = null;
  /** frames left in the current attack phase */
  private phaseFrames = 0;
  private hasHitThisActive = false;
  private isAerialAttack = false;
  private bufferedNext: 'light' | 'heavy' | null = null;

  private hitstunFrames = 0;
  private guardFlashFrames = 0;

  private readonly hasFrames: boolean;
  private currentPose: PoseName | null = null;
  private idlePoseFrames = 0;
  private idlePoseIndex = 0;
  private walkPoseFrames = 0;
  private walkPoseAlt = false;
  private jumpDirection: 'neutral' | 'forward' | 'back' = 'neutral';
  private koPoseFrames = 0;
  private koFrameIndex = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, def: CharacterDef, stageWidth: number) {
    const initialTexture =
      def.hasFrames && def.portraitKey ? poseKey(def.portraitKey, 'idle1') : def.portraitKey ?? '__MISSING';
    super(scene, x, y, initialTexture);
    this.def = def;
    this.stageWidth = stageWidth;
    this.hasFrames = def.hasFrames;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    const targetHeight = scene.scale.height * 0.4;
    this.baseScale = targetHeight / this.height;
    this.setScale(this.baseScale);
    this.baseWidth = this.displayWidth;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(this.width * 0.5, this.height * 0.94);
    body.setOffset(this.width * 0.25, this.height * 0.06);
  }

  private setPose(pose: PoseName) {
    if (!this.hasFrames || !this.def.portraitKey || this.currentPose === pose) return;
    this.currentPose = pose;
    this.setTexture(poseKey(this.def.portraitKey, pose));
    this.setScale(this.baseScale * (POSE_SCALE_CORRECTION[pose] ?? 1));

    // Each pose frame is cropped to its own bounding box, so its raw pixel
    // size differs from the reference (idle1) frame the body was sized for.
    // Re-fit the body every time, keeping offsetY + bodyHeight == height so
    // the body's bottom edge always lines up with the origin(0.5,1) anchor
    // (the character's feet), regardless of which pose is showing.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width * 0.5, this.height * 0.94);
    body.setOffset(this.width * 0.25, this.height * 0.06);
  }

  /** Advances this fighter by exactly one fixed simulation frame (1/60s). */
  step(input: FighterInput, opponent: Fighter) {
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.state !== 'ko') {
      const dx = opponent.x - this.x;
      if (Math.abs(dx) > 4) {
        this.facing = dx >= 0 ? 1 : -1;
      }
      this.setFlipX(this.facing === -1);
    }

    if (this.guardFlashFrames > 0) this.guardFlashFrames -= 1;
    if (this.guardFlashFrames <= 0) {
      this.clearTint();
    }

    const grounded = body.onFloor();

    if (this.state === 'ko') {
      body.setVelocityX(0);
      this.updateVisualPose(body);
      return;
    }

    if (this.hitstunFrames > 0) {
      this.hitstunFrames -= 1;
      this.isBacking = false;
      this.updateVisualPose(body);
      return;
    }

    if (this.attackPhase) {
      this.isBacking = false;
      this.updateAttack(input, opponent);
      if (grounded) body.setVelocityX(0);
      this.updateVisualPose(body);
      return;
    }

    if (this.state === 'guard') {
      this.state = grounded ? 'idle' : 'jump';
    }

    const towardPressed = (this.facing === 1 && input.right) || (this.facing === -1 && input.left);
    const awayPressed = (this.facing === 1 && input.left) || (this.facing === -1 && input.right);

    if (grounded) {
      this.isBacking = awayPressed && !towardPressed && !input.up;

      if (input.up) {
        let jvx = 0;
        if (towardPressed && !awayPressed) {
          jvx = JUMP_VX * this.facing;
          this.jumpDirection = 'forward';
        } else if (awayPressed && !towardPressed) {
          jvx = -JUMP_VX * this.facing;
          this.jumpDirection = 'back';
        } else {
          this.jumpDirection = 'neutral';
        }
        body.setVelocityY(JUMP_VY);
        body.setVelocityX(jvx);
        this.state = 'jump';
      } else if (input.lightAttack || input.heavyAttack) {
        this.startAttack(input.lightAttack ? 'light1' : 'heavy1', true);
      } else if (towardPressed && !awayPressed) {
        body.setVelocityX(MOVE_SPEED * this.facing);
        this.state = 'walk';
      } else if (awayPressed && !towardPressed) {
        body.setVelocityX(-MOVE_SPEED * this.facing);
        this.state = 'walk';
      } else {
        body.setVelocityX(0);
        this.state = 'idle';
      }
    } else {
      this.isBacking = false;
      this.state = 'jump';
      if (input.lightAttack || input.heavyAttack) {
        this.startAttack(input.lightAttack ? 'light1' : 'heavy1', false);
      }
    }

    this.updateVisualPose(body);
  }

  private updateVisualPose(body: Phaser.Physics.Arcade.Body) {
    if (!this.hasFrames) return;

    switch (this.state) {
      case 'idle':
        this.walkPoseFrames = 0;
        this.walkPoseAlt = false;
        this.idlePoseFrames -= 1;
        if (this.idlePoseFrames <= 0) {
          this.idlePoseFrames = IDLE_POSE_SWITCH_F;
          this.idlePoseIndex = (this.idlePoseIndex + 1) % IDLE_POSES.length;
        }
        this.setPose(IDLE_POSES[this.idlePoseIndex]);
        break;
      case 'walk':
        this.walkPoseFrames -= 1;
        if (this.walkPoseFrames <= 0) {
          this.walkPoseFrames = WALK_POSE_SWITCH_F;
          this.walkPoseAlt = !this.walkPoseAlt;
        }
        this.setPose(this.walkPoseAlt ? 'walk2' : 'walk1');
        break;
      case 'jump':
        if (body.velocity.y < 0) {
          const risingPose: PoseName =
            this.jumpDirection === 'forward'
              ? 'jump1'
              : this.jumpDirection === 'back'
                ? 'jump_back'
                : 'jump_vertical';
          this.setPose(risingPose);
        } else {
          this.setPose('jump2');
        }
        break;
      case 'attack':
        this.setPose(this.attackPhase === 'startup' ? 'punch_windup' : 'punch_active');
        break;
      case 'guard':
        this.setPose('guard_stand');
        break;
      case 'hitstun':
        // hitstunFrames counts down from HITSTUN_F: the initial snap plays
        // first, then it settles into the deeper recoil for the rest.
        this.setPose(this.hitstunFrames > HITSTUN_F - HIT_POSE1_F ? 'hit2' : 'hit3');
        break;
      case 'ko':
        if (this.koFrameIndex < KO_POSES.length - 1) {
          this.koPoseFrames -= 1;
          if (this.koPoseFrames <= 0) {
            this.koPoseFrames = KO_FRAME_F;
            this.koFrameIndex += 1;
          }
        }
        this.setPose(KO_POSES[this.koFrameIndex]);
        break;
      default:
        break;
    }
  }

  private startAttack(key: string, wasGrounded: boolean) {
    const def = ATTACKS[key];
    this.attackKey = key;
    this.attackPhase = 'startup';
    this.phaseFrames = def.startup;
    this.hasHitThisActive = false;
    this.bufferedNext = null;
    this.isAerialAttack = !wasGrounded;
    this.state = 'attack';
  }

  private updateAttack(input: FighterInput, opponent: Fighter) {
    const def = ATTACKS[this.attackKey!];

    if (input.lightAttack) this.bufferedNext = 'light';
    if (input.heavyAttack) this.bufferedNext = 'heavy';

    if (this.attackPhase === 'active' && !this.hasHitThisActive) {
      this.checkHit(def, opponent);
    }

    this.phaseFrames -= 1;
    if (this.phaseFrames > 0) return;

    if (this.attackPhase === 'startup') {
      this.attackPhase = 'active';
      this.phaseFrames = def.active;
      this.hasHitThisActive = false;
    } else if (this.attackPhase === 'active') {
      this.attackPhase = 'recovery';
      this.phaseFrames = def.recovery;
    } else if (this.attackPhase === 'recovery') {
      const next = this.bufferedNext;
      let nextKey: string | undefined;
      if (next === 'light' && def.next?.light) nextKey = def.next.light;
      if (next === 'heavy' && def.next?.heavy) nextKey = def.next.heavy;

      this.attackPhase = null;
      this.attackKey = null;
      this.state = 'idle';

      if (nextKey) this.startAttack(nextKey, true);
    }
  }

  private checkHit(def: AttackDef, opponent: Fighter) {
    const box = new Phaser.Geom.Rectangle(
      this.facing === 1 ? this.x : this.x - def.rangeX,
      this.y + def.offsetY - def.rangeY / 2,
      def.rangeX,
      def.rangeY
    );
    const oppBounds = opponent.getBounds();
    if (Phaser.Geom.Intersects.RectangleToRectangle(box, oppBounds)) {
      this.hasHitThisActive = true;
      const screenWidth = this.stageWidth / 2;
      const knockback = screenWidth * KNOCKBACK_SCREEN_RATIO;
      opponent.receiveHit(def.damage, this.facing, this.isAerialAttack, knockback);
    }
  }

  receiveHit(damage: number, attackerFacing: 1 | -1, aerialAttack: boolean, knockback: number) {
    if (this.state === 'ko') return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const grounded = body.onFloor();
    const canGuard = this.isBacking && grounded && !aerialAttack;

    if (canGuard) {
      this.state = 'guard';
      this.guardFlashFrames = GUARD_FLASH_F;
      this.setTint(0x6ec6ff);
      body.setVelocityX(attackerFacing * 80);
      return;
    }

    this.hp = Math.max(0, this.hp - damage);
    this.hitstunFrames = HITSTUN_F;
    this.attackPhase = null;
    this.attackKey = null;
    this.isBacking = false;

    const newX = Phaser.Math.Clamp(this.x + attackerFacing * knockback, 40, this.stageWidth - 40);
    this.x = newX;
    body.setVelocityX(0);

    if (this.hp <= 0) {
      this.state = 'ko';
      this.koFrameIndex = 0;
      this.koPoseFrames = KO_FRAME_F;
      body.setVelocityX(0);
    } else {
      this.state = 'hitstun';
    }
  }
}
