import Phaser from 'phaser';
import { CHARACTERS } from '../data/characters';
import { loadControlConfig, describeSide } from '../data/controlSettings';

const COLS = 3;
const ROWS = 2;
const SLOT_W = 260;
const SLOT_H = 300;
const GAP = 40;

export class CharacterSelectScene extends Phaser.Scene {
  private selectedId: number | null = null;

  constructor() {
    super('CharacterSelectScene');
  }

  create() {
    this.selectedId = null;
    const { width } = this.scale;

    this.add
      .text(width / 2, 60, 'CHARACTER SELECT', { fontSize: '40px', color: '#e94560' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 105, '使用するキャラクターを選んでください', {
        fontSize: '16px',
        color: '#cccccc',
      })
      .setOrigin(0.5);

    const cfg = loadControlConfig();
    this.add
      .text(width / 2, 132, `1P: ${describeSide(cfg.p1)}      2P: ${describeSide(cfg.p2)}`, {
        fontSize: '14px',
        color: '#9fb3d1',
      })
      .setOrigin(0.5);

    const settingsBtn = this.add
      .text(width - 20, 20, '⚙ コントローラー設定', {
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#16213e',
      })
      .setOrigin(1, 0)
      .setPadding(8)
      .setInteractive({ useHandCursor: true });
    settingsBtn.on('pointerover', () => settingsBtn.setColor('#ffd166'));
    settingsBtn.on('pointerout', () => settingsBtn.setColor('#ffffff'));
    settingsBtn.on('pointerdown', () => this.scene.start('SettingsScene'));

    const gridW = COLS * SLOT_W + (COLS - 1) * GAP;
    const gridH = ROWS * SLOT_H + (ROWS - 1) * GAP;
    const startX = width / 2 - gridW / 2 + SLOT_W / 2;
    const startY = 180 + gridH / 2 - SLOT_H / 2;

    CHARACTERS.forEach((c, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = startX + col * (SLOT_W + GAP);
      const y = startY + row * (SLOT_H + GAP);
      this.createSlot(x, y, c);
    });

    this.selectionText = this.add
      .text(width / 2, 660, '', { fontSize: '20px', color: '#ffffff' })
      .setOrigin(0.5);
  }

  private selectionText!: Phaser.GameObjects.Text;

  private createSlot(
    x: number,
    y: number,
    def: (typeof CHARACTERS)[number]
  ) {
    const box = this.add
      .rectangle(x, y, SLOT_W, SLOT_H, def.available ? 0x16213e : 0x0d0d14)
      .setStrokeStyle(2, def.available ? 0xe94560 : 0x333333);

    this.add
      .text(x - SLOT_W / 2 + 12, y - SLOT_H / 2 + 8, `No.${def.id}`, {
        fontSize: '16px',
        color: def.available ? '#ffffff' : '#666666',
      })
      .setOrigin(0, 0);

    if (def.available && def.portraitKey) {
      const portrait = this.add.image(x, y + 10, def.portraitKey);
      const scale = Math.min((SLOT_W - 40) / portrait.width, (SLOT_H - 70) / portrait.height);
      portrait.setScale(scale);

      this.add
        .text(x, y + SLOT_H / 2 - 24, def.name, { fontSize: '18px', color: '#ffffff' })
        .setOrigin(0.5);

      box.setInteractive({ useHandCursor: true });
      box.on('pointerover', () => box.setStrokeStyle(3, 0xffd166));
      box.on('pointerout', () => box.setStrokeStyle(2, 0xe94560));
      box.on('pointerdown', () => this.confirmSelection(def.id));
    } else {
      this.add
        .text(x, y, '準備中', { fontSize: '20px', color: '#555555' })
        .setOrigin(0.5);
    }
  }

  private confirmSelection(id: number) {
    if (this.selectedId === id) return;
    this.selectedId = id;
    this.selectionText.setText('対戦を開始します...');
    this.time.delayedCall(300, () => {
      this.scene.start('BattleScene', { playerId: id, opponentId: id });
    });
  }
}
