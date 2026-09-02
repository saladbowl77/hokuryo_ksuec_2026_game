# Character 4 motion frames

The eleven canonical motions are stored one directory per motion. All images are
newly generated from the archived character design reference.

`collision.json` contains alpha-derived geometry for every canonical frame:

- `bounds`: tight axis-aligned pixel bounds.
- `polygon`: a simplified clockwise outline in source-image pixel coordinates.
- `normalizedPolygon`: the same outline normalized to `0..1`, useful after scaling.

Legacy pose filenames (`idle1`, `walk1`, `jump1`, `guard_stand`, and so on) are
compatibility copies inside the motion folders, so the current game loader can
use the new art without code changes.
