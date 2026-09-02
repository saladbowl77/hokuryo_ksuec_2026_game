/**
 * Global debug-overlay toggle (F1 in the battle scene). Draws physics bodies,
 * hurtboxes, the live attack hitbox and the `collision.json` hull so the art
 * and the collision geometry can be lined up by eye. Persisted so it survives
 * scene restarts.
 */
const STORAGE_KEY = 'hokuryo.debug';

function load(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export const debug = {
  enabled: load(),
  toggle(): boolean {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem(STORAGE_KEY, this.enabled ? '1' : '0');
    } catch {
      // storage disabled — toggle still works for this session
    }
    return this.enabled;
  },
};
