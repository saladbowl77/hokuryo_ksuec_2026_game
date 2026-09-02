import Phaser from 'phaser';
import { Fighter } from '../entities/Fighter';
import { KeyboardInput, KEY_LAYOUTS } from '../entities/KeyboardInput';
import { GamepadInput } from '../entities/GamepadInput';
import { AIController } from '../entities/AIController';
import { getCharacter } from '../data/characters';
import { loadControlConfig, type SideControl } from '../data/controlSettings';
import type { FighterInput } from '../entities/FighterInput';
import { FPS, FRAME_MS, secondsToFrames } from '../core/time';

/** Reads one frame of input for a fighter. `self`/`opponent` are only used by
 * the CPU reader; keyboard/gamepad readers ignore them. */
type InputReader = (self: Fighter, opponent: Fighter) => FighterInput;

const ROUND_SECONDS = 60;
const HP_BAR_WIDTH = 460;
const CAMERA_EDGE_MARGIN_RATIO = 0.05;
/** Cap how much wall-clock time one render frame may feed the fixed-step
 * loop, so a long stall (tab in background, GC pause) can't trigger a
 * "spiral of death" of hundreds of catch-up ticks. */
const MAX_CATCHUP_MS = 100;

const IDLE_INPUT: FighterInput = {
  left: false,
  right: false,
  up: false,
  lightAttack: false,
  heavyAttack: false,
};

interface BattleData {
  playerId: number;
  opponentId: number;
}

export class BattleScene extends Phaser.Scene {
  private player!: Fighter;
  private opponent!: Fighter;
  private readP1!: InputReader;
  private readP2!: InputReader;
  private p2IsCpu = true;

  private stageWidth = 2560;
  private groundY = 620;

  private hpBarBgP2!: Phaser.GameObjects.Rectangle;
  private hpBarP1!: Phaser.GameObjects.Rectangle;
  private hpBarP2!: Phaser.GameObjects.Rectangle;
  private cpuLabel!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;

  private timeLeftFrames = secondsToFrames(ROUND_SECONDS);
  private frameAccumulatorMs = 0;
  private roundOver = false;

  constructor() {
    super('BattleScene');
  }

  create(data: BattleData) {
    this.roundOver = false;
    this.timeLeftFrames = secondsToFrames(ROUND_SECONDS);
    this.frameAccumulatorMs = 0;

    this.stageWidth = Math.round(this.scale.width * 2);
    this.groundY = Math.round(this.scale.height - this.scale.height * 0.12);

    this.physics.world.setBounds(0, 0, this.stageWidth, this.groundY);
    this.cameras.main.setBounds(0, 0, this.stageWidth, this.scale.height);
    this.cameras.main.setBackgroundColor('#1a1a2e');

    this.drawStage();

    const playerDef = getCharacter(data.playerId);
    const opponentDef = getCharacter(data.opponentId);

    this.player = new Fighter(this, this.stageWidth * 0.4, this.groundY, playerDef, this.stageWidth);
    this.opponent = new Fighter(this, this.stageWidth * 0.6, this.groundY, opponentDef, this.stageWidth);

    const controls = loadControlConfig();
    this.readP1 = this.makeReader('p1', controls.p1);
    this.readP2 = this.makeReader('p2', controls.p2);
    this.p2IsCpu = controls.p2.type === 'cpu';

    this.createHud();
    this.centerCameraInitial();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    });
  }

  /** Builds the per-frame input reader for one side from its settings. */
  private makeReader(side: 'p1' | 'p2', control: SideControl): InputReader {
    if (control.type === 'keyboard') {
      const kb = new KeyboardInput(this, KEY_LAYOUTS[side]);
      return () => kb.read();
    }
    if (control.type === 'gamepad') {
      const gp = new GamepadInput(this, control.gamepadIndex ?? 0);
      return () => gp.read();
    }
    const ai = new AIController();
    return (self, opponent) => ai.read(FRAME_MS, self, opponent);
  }

  private drawStage() {
    // Single flat backdrop for now — stretched to cover the whole stage.
    // TODO: split into sky/clouds/building/road layers for parallax later.
    this.add
      .image(0, 0, 'stage1_bg')
      .setOrigin(0, 0)
      .setDisplaySize(this.stageWidth, this.scale.height)
      .setDepth(-10);
  }

  private createHud() {
    this.add.rectangle(30, 30, HP_BAR_WIDTH, 24, 0x333333).setOrigin(0, 0).setScrollFactor(0);
    this.hpBarP1 = this.add
      .rectangle(32, 32, HP_BAR_WIDTH - 4, 20, 0x4caf50)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.hpBarBgP2 = this.add
      .rectangle(this.scale.width - 30 - HP_BAR_WIDTH, 30, HP_BAR_WIDTH, 24, 0x333333)
      .setOrigin(0, 0)
      .setScrollFactor(0);
    this.hpBarP2 = this.add
      .rectangle(this.scale.width - 32, 32, HP_BAR_WIDTH - 4, 20, 0x4caf50)
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.add.text(30, 8, '1P', { fontSize: '14px', color: '#ffffff' }).setScrollFactor(0);
    this.cpuLabel = this.add
      .text(this.scale.width - 30, 8, this.p2IsCpu ? 'CPU' : '2P', { fontSize: '14px', color: '#ffffff' })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.timerText = this.add
      .text(this.scale.width / 2, 24, '60', { fontSize: '32px', color: '#ffffff' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    this.resultText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, '', {
        fontSize: '48px',
        color: '#ffd166',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const w = gameSize.width;
    const h = gameSize.height;

    this.hpBarBgP2.setPosition(w - 30 - HP_BAR_WIDTH, 30);
    this.hpBarP2.setPosition(w - 32, 32);
    this.cpuLabel.setPosition(w - 30, 8);
    this.timerText.setPosition(w / 2, 24);
    this.resultText.setPosition(w / 2, h / 2);

    this.cameras.main.setViewport(0, 0, w, h);
  }

  update(_time: number, deltaMs: number) {
    // Fixed-timestep loop: the simulation only ever advances in whole 1/60s
    // frames (tick()), so attack/hitstun/movement timing is identical on a
    // 60Hz and a 144Hz monitor and survives momentary frame drops. Rendering
    // still happens once per requestAnimationFrame.
    this.frameAccumulatorMs += Math.min(deltaMs, MAX_CATCHUP_MS);
    while (this.frameAccumulatorMs >= FRAME_MS) {
      this.frameAccumulatorMs -= FRAME_MS;
      this.tick();
    }
  }

  /** One fixed simulation frame. */
  private tick() {
    // Keep driving both fighters even after the round ends, so a knockdown
    // animation in progress can finish playing instead of freezing on
    // whatever frame it was on — the winner's input is just cut to idle.
    const p1Input = this.roundOver ? IDLE_INPUT : this.readP1(this.player, this.opponent);
    const p2Input = this.roundOver ? IDLE_INPUT : this.readP2(this.opponent, this.player);

    this.player.step(p1Input, this.opponent);
    this.opponent.step(p2Input, this.player);

    if (this.roundOver) return;

    this.separateFighters();
    this.updateCamera();
    this.clampToView();

    this.hpBarP1.width = Math.max(0, (this.player.hp / 100) * (HP_BAR_WIDTH - 4));
    this.hpBarP2.width = Math.max(0, (this.opponent.hp / 100) * (HP_BAR_WIDTH - 4));

    this.timeLeftFrames -= 1;
    this.timerText.setText(String(Math.max(0, Math.ceil(this.timeLeftFrames / FPS))));

    if (this.player.hp <= 0 || this.opponent.hp <= 0 || this.timeLeftFrames <= 0) {
      this.endRound();
    }
  }

  private separateFighters() {
    const p1Body = this.player.body as Phaser.Physics.Arcade.Body;
    const p2Body = this.opponent.body as Phaser.Physics.Arcade.Body;
    if (!p1Body.onFloor() || !p2Body.onFloor()) return;

    const minGap = (this.player.baseWidth + this.opponent.baseWidth) * 0.42;
    const dx = this.opponent.x - this.player.x;
    const dist = Math.abs(dx);
    if (dist >= minGap) return;

    const dir = dist === 0 ? 1 : Math.sign(dx);
    const overlap = (minGap - dist) / 2;

    this.player.x = Phaser.Math.Clamp(this.player.x - dir * overlap, 40, this.stageWidth - 40);
    this.opponent.x = Phaser.Math.Clamp(this.opponent.x + dir * overlap, 40, this.stageWidth - 40);
  }

  /** Centers the camera on the stage once, at round start (spec 2.). */
  private centerCameraInitial() {
    const midX = (this.player.x + this.opponent.x) / 2;
    this.cameras.main.scrollX = Phaser.Math.Clamp(
      midX - this.scale.width / 2,
      0,
      this.stageWidth - this.scale.width
    );
  }

  /**
   * Soft/dead-zone camera: holds still while both fighters stay within a
   * symmetric margin from each screen edge, and pans only as far as it can
   * while still keeping BOTH fighters in view.
   *
   * If one fighter is already pinned at the current view's edge (the camera
   * used up its pan budget getting them there) and the other fighter then
   * retreats toward the opposite edge, panning further to follow the
   * retreating one would push the pinned one out of view — so instead the
   * camera holds still, and clampToView() below walls off the one who's
   * over-extending instead of dragging the other one along.
   */
  private updateCamera() {
    const cam = this.cameras.main;
    const viewW = this.scale.width;
    const margin = viewW * CAMERA_EDGE_MARGIN_RATIO;

    const minX = Math.min(this.player.x, this.opponent.x);
    const maxX = Math.max(this.player.x, this.opponent.x);

    // scrollX must be >= lowerBound to keep maxX in view, and <= upperBound
    // to keep minX in view. When lowerBound > upperBound, both can't fit at
    // once — leave scrollX exactly where it is rather than picking a side.
    const lowerBound = maxX - viewW + margin;
    const upperBound = minX - margin;

    let scrollX = cam.scrollX;
    if (lowerBound <= upperBound) {
      scrollX = Phaser.Math.Clamp(scrollX, lowerBound, upperBound);
    }

    cam.scrollX = Phaser.Math.Clamp(scrollX, 0, this.stageWidth - viewW);
  }

  /**
   * A fighter can never walk past the same margin line the camera itself
   * tries to hold them inside of (see updateCamera). Near the stage's true
   * ends the camera is maxed out (it already used its ±50% pan budget), so
   * that margin line is where movement finally hits a wall — the two never
   * disagree, since they share one threshold.
   */
  private clampToView() {
    const cam = this.cameras.main;
    const viewW = this.scale.width;
    const margin = viewW * CAMERA_EDGE_MARGIN_RATIO;
    const left = cam.scrollX + margin;
    const right = cam.scrollX + viewW - margin;

    for (const fighter of [this.player, this.opponent]) {
      fighter.x = Phaser.Math.Clamp(fighter.x, left, right);
    }
  }

  private endRound() {
    this.roundOver = true;

    let msg: string;
    if (this.player.hp === this.opponent.hp) {
      msg = 'DRAW';
    } else if (this.player.hp > this.opponent.hp) {
      msg = 'WIN';
    } else {
      msg = 'LOSE';
    }

    this.resultText.setText(`${msg}\n\nSPACEでキャラクター選択へ`);

    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    spaceKey.once('down', () => {
      this.scene.start('CharacterSelectScene');
    });
  }
}
