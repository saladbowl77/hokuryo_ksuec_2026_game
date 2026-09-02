/**
 * Which input device drives each side of the match. Chosen on the
 * SettingsScene, persisted to localStorage, and read by BattleScene when a
 * round starts.
 */
export type SideControlType = 'cpu' | 'keyboard' | 'gamepad';

export interface SideControl {
  type: SideControlType;
  /** Browser gamepad index — only meaningful when type === 'gamepad'. */
  gamepadIndex?: number;
}

export interface ControlConfig {
  p1: SideControl;
  p2: SideControl;
}

const STORAGE_KEY = 'hokuryo.controls.v1';

function defaults(): ControlConfig {
  return { p1: { type: 'keyboard' }, p2: { type: 'cpu' } };
}

function normalizeSide(raw: unknown, fallback: SideControl): SideControl {
  if (!raw || typeof raw !== 'object') return fallback;
  const type = (raw as { type?: unknown }).type;
  if (type === 'cpu' || type === 'keyboard') return { type };
  if (type === 'gamepad') {
    const idx = Number((raw as { gamepadIndex?: unknown }).gamepadIndex);
    return { type: 'gamepad', gamepadIndex: Number.isFinite(idx) ? idx : 0 };
  }
  return fallback;
}

export function loadControlConfig(): ControlConfig {
  const base = defaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<ControlConfig>;
    return {
      p1: normalizeSide(parsed.p1, base.p1),
      p2: normalizeSide(parsed.p2, base.p2),
    };
  } catch {
    return base;
  }
}

export function saveControlConfig(config: ControlConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Storage disabled (private mode etc.) — settings just won't persist.
  }
}

/** True when both sides point at the exact same option (used to highlight the
 * currently-selected row in the settings UI). */
export function controlEquals(a: SideControl, b: SideControl): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'gamepad') return (a.gamepadIndex ?? 0) === (b.gamepadIndex ?? 0);
  return true;
}

/** True when assigning both sides to this device would be a real conflict.
 * Two CPUs are fine; one keyboard or one physical pad can't drive both. */
export function isDeviceClash(a: SideControl, b: SideControl): boolean {
  return a.type !== 'cpu' && controlEquals(a, b);
}

export function describeSide(s: SideControl): string {
  if (s.type === 'cpu') return 'CPU';
  if (s.type === 'keyboard') return 'キーボード';
  return `パッド${(s.gamepadIndex ?? 0) + 1}`;
}
