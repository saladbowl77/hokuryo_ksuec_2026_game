import Phaser from 'phaser';
import { CHARACTERS, POSE_NAMES, poseFramePath, poseKey } from '../data/characters';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.image('stage1_bg', '/assets/stages/1/background.png');

    for (const c of CHARACTERS) {
      if (!c.portraitKey) continue;
      this.load.image(c.portraitKey, `/assets/characters/${c.id}-archive/portrait.png`);

      if (c.hasFrames) {
        for (const pose of POSE_NAMES) {
          this.load.image(poseKey(c.portraitKey, pose), poseFramePath(c.id, pose));
        }
      }
    }
  }

  create() {
    this.scene.start('CharacterSelectScene');
  }
}
