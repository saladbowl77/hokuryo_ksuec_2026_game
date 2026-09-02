export type CharacterKind = 'melee' | 'ranged';

export interface CharacterDef {
  id: number;
  name: string;
  kind: CharacterKind;
  portraitKey: string | null;
  hasFrames: boolean;
  available: boolean;
}

export const POSE_NAMES = [
  'idle1',
  'idle2',
  'idle3',
  'idle4',
  'walk1',
  'walk2',
  'jump1',
  'jump2',
  'jump_vertical',
  'jump_back',
  'guard_stand',
  'guard_crouch',
  'punch_windup',
  'punch_active',
  'hit2',
  'hit3',
  'down1',
  'down2',
  'down3',
  'down4',
  'down5',
  'down6',
] as const;

export type PoseName = (typeof POSE_NAMES)[number];

const POSE_GROUPS: Record<PoseName, string> = {
  idle1: 'idle',
  idle2: 'idle',
  idle3: 'idle',
  idle4: 'idle',
  walk1: 'walk',
  walk2: 'walk',
  jump1: 'jump',
  jump2: 'jump',
  jump_vertical: 'jump',
  jump_back: 'jump',
  guard_stand: 'guard',
  guard_crouch: 'guard',
  punch_windup: 'punch',
  punch_active: 'punch',
  hit2: 'hit',
  hit3: 'hit',
  down1: 'down',
  down2: 'down',
  down3: 'down',
  down4: 'down',
  down5: 'down',
  down6: 'down',
};

export function poseKey(portraitKey: string, pose: PoseName) {
  return `${portraitKey}_${pose}`;
}

/** Per-pose scale correction on top of the shared, normalized 1536px canvas. */
export const POSE_SCALE_CORRECTION: Partial<Record<PoseName, number>> = {};

export function poseFramePath(characterId: number, pose: PoseName) {
  return `/assets/characters/${characterId}-archive/frames/${POSE_GROUPS[pose]}/${pose}.png`;
}

export const CHARACTERS: CharacterDef[] = [
  { id: 1, name: '???', kind: 'melee', portraitKey: null, hasFrames: false, available: false },
  { id: 2, name: '???', kind: 'melee', portraitKey: null, hasFrames: false, available: false },
  { id: 3, name: '???', kind: 'ranged', portraitKey: null, hasFrames: false, available: false },
  { id: 4, name: 'キャラクター4', kind: 'melee', portraitKey: 'char4', hasFrames: true, available: true },
  { id: 5, name: '???', kind: 'ranged', portraitKey: null, hasFrames: false, available: false },
  { id: 6, name: '???', kind: 'melee', portraitKey: null, hasFrames: false, available: false },
];

export function getCharacter(id: number): CharacterDef {
  const def = CHARACTERS.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown character id: ${id}`);
  return def;
}
