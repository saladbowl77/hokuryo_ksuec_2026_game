export type CharacterKind = 'melee' | 'ranged';

export interface CharacterDef {
  id: number;
  name: string;
  kind: CharacterKind;
  portraitKey: string | null;
  hasFrames: boolean;
  available: boolean;
}

/**
 * The canonical motions, one PNG per motion under
 * `public/assets/characters/<id>/frames/<motion>/<motion>.png`, mirroring
 * that folder's `motions.json`. All frames share a normalized 1536px canvas,
 * so no per-motion scale correction is needed. `collision.json` in the same
 * folder carries an alpha-derived outer hull for each of these.
 */
export const MOTION_IDS = [
  'idle',
  'attack',
  'backward_guard',
  'jump_vertical',
  'jump_forward',
  'jump_backward',
  'jump_attack',
  'crouch',
  'crouch_slide_attack',
  'hit',
  'down',
] as const;

export type MotionId = (typeof MOTION_IDS)[number];

export function motionKey(portraitKey: string, motion: MotionId) {
  return `${portraitKey}__${motion}`;
}

export function motionImagePath(characterId: number, motion: MotionId) {
  return `/assets/characters/${characterId}/frames/${motion}/${motion}.png`;
}

export function collisionKey(portraitKey: string) {
  return `${portraitKey}__collision`;
}

export function collisionPath(characterId: number) {
  return `/assets/characters/${characterId}/frames/collision.json`;
}

/**
 * Knockdown is a genuine multi-frame sequence (stagger → fall → flat), unlike
 * the other motions which are a single pose. The frames live at
 * `frames/down/down1..down6.png` and are NOT on the shared 1536px canvas
 * (they came from the archived sheet), so Fighter scales them separately and
 * they have no `collision.json` entry.
 */
export const KO_SEQUENCE_LENGTH = 6;
/** Standing character height (px) in the archived sheet the KO frames came
 * from — used to rescale them to match the current 1536px art. */
export const KO_SOURCE_REF_HEIGHT = 395;

export function koFrameKey(portraitKey: string, index: number) {
  return `${portraitKey}__ko${index}`;
}

export function koFramePath(characterId: number, index: number) {
  return `/assets/characters/${characterId}/frames/down/down${index}.png`;
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
