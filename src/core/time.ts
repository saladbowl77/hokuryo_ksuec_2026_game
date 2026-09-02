/**
 * Fixed-timestep clock. The whole battle simulation (movement, attack
 * phases, hitstun, pose timers) advances in whole 1/60-second frames so that
 * timing is identical regardless of the monitor's refresh rate or momentary
 * frame drops. Rendering still happens once per requestAnimationFrame tick.
 *
 * All gameplay timing constants are expressed in frames. Use frames, not
 * milliseconds, for anything that affects the fight — the numbers double as
 * the design/balance spec (e.g. "light1: 5F startup / 5F active / 12F recovery").
 */
export const FPS = 60;
export const FRAME_MS = 1000 / FPS;

/** Frames elapsed in the given number of seconds. */
export const secondsToFrames = (seconds: number) => Math.round(seconds * FPS);

/** Nearest whole frame count for a millisecond duration (migration helper). */
export const msToFrames = (ms: number) => Math.round(ms / FRAME_MS);
