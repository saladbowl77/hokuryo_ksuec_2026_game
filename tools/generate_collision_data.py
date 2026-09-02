#!/usr/bin/env python3
"""Generate alpha-derived bounds and outer hulls for character PNG frames."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image


def convex_hull(points: set[tuple[int, int]]) -> list[tuple[int, int]]:
    ordered = sorted(points)
    if len(ordered) <= 1:
        return ordered

    def cross(o: tuple[int, int], a: tuple[int, int], b: tuple[int, int]) -> int:
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower: list[tuple[int, int]] = []
    for point in ordered:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], point) <= 0:
            lower.pop()
        lower.append(point)

    upper: list[tuple[int, int]] = []
    for point in reversed(ordered):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], point) <= 0:
            upper.pop()
        upper.append(point)
    return lower[:-1] + upper[:-1]


def geometry(path: Path) -> dict[str, object]:
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError(f"frame has no visible pixels: {path}")

    width, height = image.size
    pixels = alpha.load()
    edge: set[tuple[int, int]] = set()
    for y in range(height):
        for x in range(width):
            if pixels[x, y] < 16:
                continue
            if x == 0 or y == 0 or x == width - 1 or y == height - 1 or any(
                pixels[nx, ny] < 16
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1))
            ):
                edge.add((x, y))

    hull = convex_hull(edge)
    left, top, right, bottom = bbox
    return {
        "image": {"width": width, "height": height},
        "alphaThreshold": 16,
        "bounds": {"x": left, "y": top, "width": right - left, "height": bottom - top},
        "polygon": [{"x": x, "y": y} for x, y in hull],
        "normalizedPolygon": [
            {"x": round(x / width, 6), "y": round(y / height, 6)} for x, y in hull
        ],
    }


def main() -> None:
    frames_root = Path(sys.argv[1] if len(sys.argv) > 1 else "public/assets/characters/4/frames")
    output = Path(sys.argv[2] if len(sys.argv) > 2 else frames_root / "collision.json")
    canonical = [
        "attack",
        "backward_guard",
        "jump_vertical",
        "jump_forward",
        "jump_backward",
        "idle",
        "jump_attack",
        "crouch",
        "crouch_slide_attack",
        "hit",
        "down",
    ]
    data = {
        "version": 1,
        "coordinateSystem": "image pixels, origin at top-left",
        "geometry": "alpha-derived convex outer hull",
        "frames": {
            name: geometry(frames_root / name / f"{name}.png") for name in canonical
        },
    }
    output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
