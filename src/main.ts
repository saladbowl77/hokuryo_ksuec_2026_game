import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { SettingsScene } from './scenes/SettingsScene';
import { BattleScene } from './scenes/BattleScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  input: {
    gamepad: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 2000 },
      // Step physics in fixed 1/60s increments to match the scene's
      // fixed-timestep simulation loop (see BattleScene.update).
      fps: 60,
      fixedStep: true,
      debug: false,
    },
  },
  scene: [BootScene, CharacterSelectScene, SettingsScene, BattleScene],
};

const game = new Phaser.Game(config);
if (import.meta.env.DEV) {
  // Handy for poking at scene state from the devtools console during dev.
  (window as unknown as { __game: Phaser.Game }).__game = game;
}

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
