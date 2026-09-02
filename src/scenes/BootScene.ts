import Phaser from 'phaser';
import {
  CHARACTERS,
  MOTION_IDS,
  motionImagePath,
  motionKey,
  collisionKey,
  collisionPath,
  KO_SEQUENCE_LENGTH,
  koFrameKey,
  koFramePath,
} from '../data/characters';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.image('stage1_bg', '/assets/stages/1/background.png');

    for (const c of CHARACTERS) {
      if (!c.portraitKey) continue;
      this.load.image(c.portraitKey, `/assets/characters/${c.id}/portrait.png`);

      if (c.hasFrames) {
        for (const motion of MOTION_IDS) {
          this.load.image(motionKey(c.portraitKey, motion), motionImagePath(c.id, motion));
        }
        for (let i = 1; i <= KO_SEQUENCE_LENGTH; i++) {
          this.load.image(koFrameKey(c.portraitKey, i), koFramePath(c.id, i));
        }
        this.load.json(collisionKey(c.portraitKey), collisionPath(c.id));
      }
    }
  }

  create() {
    this.scene.start('CharacterSelectScene');
  }
}
