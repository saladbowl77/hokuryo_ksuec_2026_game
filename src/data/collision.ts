import type { MotionId } from './characters';

/** One frame's alpha-derived geometry, as emitted in
 * `public/assets/characters/<id>/frames/collision.json`. Coordinates are in
 * source-image pixels, origin top-left; `normalizedPolygon` is the same shape
 * in 0..1 so it survives scaling. */
export interface MotionCollision {
  image: { width: number; height: number };
  bounds: { x: number; y: number; width: number; height: number };
  polygon: Array<{ x: number; y: number }>;
  normalizedPolygon: Array<{ x: number; y: number }>;
}

export interface CollisionFile {
  version: number;
  frames: Partial<Record<MotionId, MotionCollision>>;
}

/** Normalized AABB (0..1 in image space) for a motion, falling back to a
 * sensible centered box when the motion is missing from the file. */
export function normalizedBounds(
  collision: CollisionFile | null,
  motion: MotionId
): { x: number; y: number; width: number; height: number } {
  const frame = collision?.frames?.[motion];
  if (!frame) return { x: 0.28, y: 0.06, width: 0.44, height: 0.92 };
  const { image, bounds } = frame;
  return {
    x: bounds.x / image.width,
    y: bounds.y / image.height,
    width: bounds.width / image.width,
    height: bounds.height / image.height,
  };
}
