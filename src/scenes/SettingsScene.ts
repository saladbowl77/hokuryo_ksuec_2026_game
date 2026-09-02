import Phaser from 'phaser';
import {
  loadControlConfig,
  saveControlConfig,
  controlEquals,
  isDeviceClash,
  type ControlConfig,
  type SideControl,
} from '../data/controlSettings';
import { KEY_LAYOUT_HINT } from '../entities/KeyboardInput';

type Side = 'p1' | 'p2';

interface DeviceOption {
  label: string;
  hint: string;
  control: SideControl;
}

const ROW_W = 400;
const ROW_H = 56;
const ROW_GAP = 12;

export class SettingsScene extends Phaser.Scene {
  private config!: ControlConfig;
  private statusText!: Phaser.GameObjects.Text;
  private rows: Phaser.GameObjects.GameObject[] = [];
  private lastPadCount = -1;

  constructor() {
    super('SettingsScene');
  }

  create() {
    this.config = loadControlConfig();
    const { width, height } = this.scale;

    this.add
      .text(width / 2, 50, 'コントローラー設定', { fontSize: '36px', color: '#e94560' })
      .setOrigin(0.5);
    this.statusText = this.add
      .text(width / 2, 92, '', { fontSize: '13px', color: '#9fb3d1' })
      .setOrigin(0.5);

    const back = this.add
      .text(width / 2, height - 46, '  決定して戻る  ', {
        fontSize: '22px',
        color: '#ffffff',
        backgroundColor: '#16213e',
      })
      .setOrigin(0.5)
      .setPadding(8)
      .setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setColor('#ffd166'));
    back.on('pointerout', () => back.setColor('#ffffff'));
    back.on('pointerdown', () => {
      saveControlConfig(this.config);
      this.scene.start('CharacterSelectScene');
    });

    this.rebuild();

    const onPadChange = () => this.rebuild();
    this.input.gamepad?.on('connected', onPadChange);
    this.input.gamepad?.on('disconnected', onPadChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.gamepad?.off('connected', onPadChange);
      this.input.gamepad?.off('disconnected', onPadChange);
    });
  }

  update() {
    // The browser only reveals a gamepad after its first button press, and
    // Phaser doesn't always emit 'connected' for pads already held down on
    // load — so poll the count and rebuild the list when it changes.
    const count = this.padCount();
    if (count !== this.lastPadCount) {
      this.lastPadCount = count;
      this.rebuild();
    }
  }

  private padCount(): number {
    return (this.input.gamepad?.gamepads ?? []).filter((p) => !!p).length;
  }

  private deviceOptions(): DeviceOption[] {
    const options: DeviceOption[] = [
      { label: 'CPU', hint: '自動で操作（従来どおり）', control: { type: 'cpu' } },
      { label: 'キーボード', hint: '', control: { type: 'keyboard' } },
    ];
    for (const pad of this.input.gamepad?.gamepads ?? []) {
      if (!pad) continue;
      options.push({
        label: `ゲームパッド ${pad.index + 1}`,
        hint: (pad.id ?? '').slice(0, 46),
        control: { type: 'gamepad', gamepadIndex: pad.index },
      });
    }
    return options;
  }

  private rebuild() {
    this.rows.forEach((o) => o.destroy());
    this.rows = [];

    const { width } = this.scale;
    const options = this.deviceOptions();
    const sides: Side[] = ['p1', 'p2'];

    sides.forEach((side, col) => {
      const cx = width / 2 + (col === 0 ? -1 : 1) * (ROW_W / 2 + 24);
      const topY = 140;

      this.track(
        this.add
          .text(cx, topY, side === 'p1' ? '1P' : '2P', { fontSize: '26px', color: '#ffffff' })
          .setOrigin(0.5, 0)
      );

      options.forEach((opt, i) => {
        const y = topY + 44 + i * (ROW_H + ROW_GAP);
        const selected = controlEquals(this.config[side], opt.control);

        const box = this.add
          .rectangle(cx, y, ROW_W, ROW_H, selected ? 0x2d4a7a : 0x16213e)
          .setStrokeStyle(2, selected ? 0xffd166 : 0x39507a)
          .setInteractive({ useHandCursor: true });
        box.on('pointerover', () => {
          if (!selected) box.setStrokeStyle(2, 0x6ec6ff);
        });
        box.on('pointerout', () => {
          if (!selected) box.setStrokeStyle(2, 0x39507a);
        });
        box.on('pointerdown', () => this.choose(side, opt.control));
        this.track(box);

        const hintStr = opt.control.type === 'keyboard' ? KEY_LAYOUT_HINT[side] : opt.hint;
        this.track(
          this.add.text(cx - ROW_W / 2 + 16, y - (hintStr ? 12 : 8), opt.label, {
            fontSize: '18px',
            color: '#ffffff',
          })
        );
        if (hintStr) {
          this.track(
            this.add.text(cx - ROW_W / 2 + 16, y + 8, hintStr, {
              fontSize: '11px',
              color: '#9fb3d1',
            })
          );
        }
      });
    });

    this.statusText.setText(
      `接続中のゲームパッド: ${this.padCount()} 台   —   一覧に出てこない時はパッドのボタンを一度押してください`
    );
  }

  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.rows.push(obj);
    return obj;
  }

  private choose(side: Side, control: SideControl) {
    this.config[side] = { ...control };
    const other: Side = side === 'p1' ? 'p2' : 'p1';
    if (isDeviceClash(this.config[side], this.config[other])) {
      // Can't share one physical device across both sides — bump the other
      // side back to CPU.
      this.config[other] = { type: 'cpu' };
    }
    saveControlConfig(this.config);
    this.rebuild();
  }
}
