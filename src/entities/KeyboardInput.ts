import Phaser from 'phaser';
import type { FighterInput } from './FighterInput';

const KC = Phaser.Input.Keyboard.KeyCodes;

export interface KeyLayout {
  left: number;
  right: number;
  up: number;
  light: number;
  heavy: number;
}

/** Fixed per-side keyboard layouts. A side that picks "keyboard" in the
 * settings gets the layout for its slot, so 1P and 2P never collide. */
export const KEY_LAYOUTS: Record<'p1' | 'p2', KeyLayout> = {
  p1: { left: KC.LEFT, right: KC.RIGHT, up: KC.UP, light: KC.Z, heavy: KC.X },
  p2: { left: KC.A, right: KC.D, up: KC.W, light: KC.F, heavy: KC.G },
};

export const KEY_LAYOUT_HINT: Record<'p1' | 'p2', string> = {
  p1: '←/→ 移動  ↑ ジャンプ  Z 弱  X 強',
  p2: 'A/D 移動  W ジャンプ  F 弱  G 強',
};

export class KeyboardInput {
  private left: Phaser.Input.Keyboard.Key;
  private right: Phaser.Input.Keyboard.Key;
  private up: Phaser.Input.Keyboard.Key;
  private light: Phaser.Input.Keyboard.Key;
  private heavy: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, layout: KeyLayout) {
    const kb = scene.input.keyboard!;
    this.left = kb.addKey(layout.left);
    this.right = kb.addKey(layout.right);
    this.up = kb.addKey(layout.up);
    this.light = kb.addKey(layout.light);
    this.heavy = kb.addKey(layout.heavy);
  }

  read(): FighterInput {
    return {
      left: this.left.isDown,
      right: this.right.isDown,
      up: this.up.isDown,
      lightAttack: Phaser.Input.Keyboard.JustDown(this.light),
      heavyAttack: Phaser.Input.Keyboard.JustDown(this.heavy),
    };
  }
}
