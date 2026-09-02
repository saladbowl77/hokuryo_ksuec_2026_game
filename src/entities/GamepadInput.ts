import type { FighterInput } from './FighterInput';

const STICK_DEADZONE = 0.35;
const DPAD_UP = 12;
const DPAD_LEFT = 14;
const DPAD_RIGHT = 15;
const BUTTON_LIGHT = 0; // A / Cross
const BUTTON_HEAVY = 1; // B / Circle

const EMPTY: FighterInput = { left: false, right: false, up: false, lightAttack: false, heavyAttack: false };

/**
 * Reads one Standard Gamepad (a fixed browser gamepad index, assigned on the
 * SettingsScene) via Phaser's Gamepad plugin. Polled each frame, with manual
 * press-edge tracking for the attack buttons so a held button doesn't
 * repeat-fire every frame.
 */
export class GamepadInput {
  private readonly scene: Phaser.Scene;
  private readonly padIndex: number;
  private prevLight = false;
  private prevHeavy = false;

  constructor(scene: Phaser.Scene, padIndex: number) {
    this.scene = scene;
    this.padIndex = padIndex;
  }

  read(): FighterInput {
    const manager = this.scene.input.gamepad;
    if (!manager) return EMPTY;

    const pad = manager.getPad(this.padIndex);
    if (!pad || !pad.connected) {
      this.prevLight = false;
      this.prevHeavy = false;
      return EMPTY;
    }

    const axisX = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
    const axisY = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;

    const left = pad.buttons[DPAD_LEFT]?.pressed || axisX < -STICK_DEADZONE;
    const right = pad.buttons[DPAD_RIGHT]?.pressed || axisX > STICK_DEADZONE;
    const up = pad.buttons[DPAD_UP]?.pressed || axisY < -STICK_DEADZONE;

    const lightDown = pad.buttons[BUTTON_LIGHT]?.pressed ?? false;
    const heavyDown = pad.buttons[BUTTON_HEAVY]?.pressed ?? false;
    const lightAttack = lightDown && !this.prevLight;
    const heavyAttack = heavyDown && !this.prevHeavy;
    this.prevLight = lightDown;
    this.prevHeavy = heavyDown;

    return { left, right, up, lightAttack, heavyAttack };
  }
}
