import Phaser from 'phaser';
import type { CharacterDef, MotionId } from '../data/characters';
import {
  motionKey,
  collisionKey,
  koFrameKey,
  KO_SEQUENCE_LENGTH,
  KO_SOURCE_REF_HEIGHT,
} from '../data/characters';
import { normalizedBounds, type CollisionFile } from '../data/collision';
import type { FighterInput } from './FighterInput';

export type FighterState = 'idle' | 'walk' | 'jump' | 'attack' | 'hitstun' | 'guard' | 'ko';
type AttackPhase = 'startup' | 'active' | 'recovery' | null;

// Velocities stay in px/second — Phaser's Arcade physics integrates them, and
// with fixedStep physics at 60fps that is already deterministic. Everything
// that counts down (attack phases, hitstun) is in FRAMES.
const MOVE_SPEED = 340;
const JUMP_VY = -1400;
const JUMP_VX = 340;
const GUARD_FLASH_F = 9; // ~150ms — brief blue tint on a successful guard
const HITSTUN_F = 23; // ~380ms
const KO_FRAME_F = 8; // ~130ms per knockdown frame
const MAX_HP = 100;
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
  /** Width of the idle hurtbox at spawn (world px) — used for push-apart
   * spacing so a wide attack/hit frame doesn't momentarily inflate the gap. */
  readonly baseWidth: number;
  private readonly baseScale: number;
  private readonly stageWidth: number;
  private readonly groundY: number;
  private readonly collision: CollisionFile | null;

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
  private currentMotion: MotionId | null = null;
  private jumpDirection: 'neutral' | 'forward' | 'back' = 'neutral';

  /** Knockdown is a 6-frame sequence (see characters.ts). */
  private koFrameIndex = 0;
  private koFrameFrames = 0;
  private readonly koScale: number;

  constructor(scene: Phaser.Scene, x: number, y: number, def: CharacterDef, stageWidth: number) {
    const framed = def.hasFrames && def.portraitKey;
    const initialTexture = framed ? motionKey(def.portraitKey!, 'idle') : def.portraitKey ?? '__MISSING';
    super(scene, x, y, initialTexture);
    this.def = def;
    this.stageWidth = stageWidth;
    this.groundY = y;
    this.hasFrames = !!framed;
    this.collision =
      framed && scene.cache.json.exists(collisionKey(def.portraitKey!))
        ? (scene.cache.json.get(collisionKey(def.portraitKey!)) as CollisionFile)
        : null;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    const targetHeight = scene.scale.height * 0.4;
    this.baseScale = targetHeight / this.height;
    this.setScale(this.baseScale);
    if (this.hasFrames) this.currentMotion = 'idle';

    const idle = normalizedBounds(this.collision, 'idle');
    this.baseWidth = idle.width * this.displayWidth;

    // KO frames were authored on a different (smaller) sheet, so rescale them
    // so the standing figure in frame 1 matches the current art's height.
    this.koScale = this.baseScale * ((idle.height * this.height) / KO_SOURCE_REF_HEIGHT);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    // Body is the alpha-derived idle box, held fixed for all motions so it
    // stays stable. Its bottom edge is pinned to the sprite's feet
    // (origin 0.5, 1) so onFloor() lines up regardless of the frame shown.
    const topPx = idle.y * this.height;
    body.setSize(idle.width * this.width, this.height - topPx);
    body.setOffset(idle.x * this.width, topPx);
  }

  /** The motion PNG that represents the current state. */
  private motionForState(): MotionId {
    switch (this.state) {
      case 'walk':
        // No dedicated walk art — the neutral stance reads better than the
        // old stance⇄guard flicker.
        return 'idle';
      case 'jump':
        return this.jumpDirection === 'forward'
          ? 'jump_forward'
          : this.jumpDirection === 'back'
            ? 'jump_backward'
            : 'jump_vertical';
      case 'attack':
        if (this.isAerialAttack) return 'jump_attack';
        return this.attackPhase === 'startup' ? 'idle' : 'attack';
      case 'guard':
        return 'backward_guard';
      case 'hitstun':
        return 'hit';
      case 'ko':
        return 'down';
      default:
        return 'idle';
    }
  }

  private setMotion(motion: MotionId) {
    if (!this.hasFrames || !this.def.portraitKey || this.currentMotion === motion) return;
    this.currentMotion = motion;
    this.setTexture(motionKey(this.def.portraitKey, motion));
    // All motion frames share the 1536px canvas, so the spawn scale still
    // holds and the physics body does not need refitting.
    this.setScale(this.baseScale);
  }

  /** Maps a point given in 0..1 image space (origin top-left) to world
   * coordinates, honouring origin (0.5, 1), scale and facing. */
  private imagePointToWorld(nx: number, ny: number): { x: number; y: number } {
    const w = this.displayWidth;
    const h = this.displayHeight;
    const x = this.facing === -1 ? this.x + (0.5 - nx) * w : this.x + (nx - 0.5) * w;
    return { x, y: this.y + (ny - 1) * h };
  }

  /** World-space AABB of the character's vulnerable area for the motion
   * currently showing, derived from `collision.json`. */
  hurtboxRect(): Phaser.Geom.Rectangle {
    const nb = normalizedBounds(this.collision, this.motionForState());
    const a = this.imagePointToWorld(nb.x, nb.y);
    const b = this.imagePointToWorld(nb.x + nb.width, nb.y + nb.height);
    const left = Math.min(a.x, b.x);
    const top = Math.min(a.y, b.y);
    return new Phaser.Geom.Rectangle(left, top, Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  }

  /** World-space outline of the current motion's collision hull (debug only).
   * Empty when the motion has no `collision.json` entry (e.g. the KO frames). */
  hurtboxPolygon(): Phaser.Math.Vector2[] {
    const frame = this.collision?.frames?.[this.motionForState()];
    if (!frame) return [];
    return frame.normalizedPolygon.map((p) => {
      const w = this.imagePointToWorld(p.x, p.y);
      return new Phaser.Math.Vector2(w.x, w.y);
    });
  }

  /** The live attack hitbox this frame, or null when no hitbox is out. */
  currentHitbox(): Phaser.Geom.Rectangle | null {
    if (this.attackPhase !== 'active' || !this.attackKey) return null;
    const def = ATTACKS[this.attackKey];
    return new Phaser.Geom.Rectangle(
      this.facing === 1 ? this.x : this.x - def.rangeX,
      this.y + def.offsetY - def.rangeY / 2,
      def.rangeX,
      def.rangeY
    );
  }

  /** One-line status string for the debug overlay. */
  debugLabel(): string {
    const phase = this.attackPhase ? `:${this.attackPhase}(${this.phaseFrames})` : '';
    const extra =
      this.state === 'hitstun'
        ? ` ${this.hitstunFrames}`
        : this.state === 'ko'
          ? ` ${this.koFrameIndex + 1}/${KO_SEQUENCE_LENGTH}`
          : '';
    return `${this.state}${phase}${extra}  hp:${this.hp}  face:${this.facing > 0 ? '→' : '←'}`;
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

    if (this.state === 'ko') {
      // Body is disabled on KO — just keep the knockdown frames advancing.
      this.setPosition(this.x, this.groundY);
      this.updateVisualPose();
      return;
    }

    const grounded = body.onFloor();

    if (this.hitstunFrames > 0) {
      this.hitstunFrames -= 1;
      this.isBacking = false;
      this.updateVisualPose();
      return;
    }

    if (this.attackPhase) {
      this.isBacking = false;
      this.updateAttack(input, opponent);
      if (grounded) body.setVelocityX(0);
      this.updateVisualPose();
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

    this.updateVisualPose();
  }

  private updateVisualPose() {
    if (this.state === 'ko' && this.hasFrames && this.def.portraitKey) {
      if (this.koFrameIndex < KO_SEQUENCE_LENGTH - 1) {
        this.koFrameFrames -= 1;
        if (this.koFrameFrames <= 0) {
          this.koFrameFrames = KO_FRAME_F;
          this.koFrameIndex += 1;
        }
      }
      const key = koFrameKey(this.def.portraitKey, this.koFrameIndex + 1);
      if (this.texture.key !== key) this.setTexture(key);
      this.setScale(this.koScale);
      this.currentMotion = null; // so a later state change re-applies its motion
      return;
    }
    this.setMotion(this.motionForState());
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
      this.checkHit(opponent);
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

  private checkHit(opponent: Fighter) {
    const box = this.currentHitbox();
    if (!box || !this.attackKey) return;
    if (Phaser.Geom.Intersects.RectangleToRectangle(box, opponent.hurtboxRect())) {
      this.hasHitThisActive = true;
      const knockback = (this.stageWidth / 2) * KNOCKBACK_SCREEN_RATIO;
      opponent.receiveHit(ATTACKS[this.attackKey].damage, this.facing, this.isAerialAttack, knockback);
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
      this.koFrameFrames = KO_FRAME_F;
      // The knockdown frames come from a different-sized sheet, so the fixed
      // idle body no longer matches them. Take the KO'd fighter out of physics
      // entirely and pin its feet to the ground — the down1→down6 sequence is
      // itself the fall animation.
      body.setVelocity(0, 0);
      body.enable = false;
      this.setPosition(this.x, this.groundY);
    } else {
      this.state = 'hitstun';
    }
  }
}
