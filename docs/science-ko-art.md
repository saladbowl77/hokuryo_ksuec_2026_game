# 理科 KO モーション

生成方法: built-in image_gen（imagegen スキル）。2026-09-07。

保存先: `public/assets/science-ko.png`。元ファイルは `/Users/taiyo/.codex/generated_images/01a07be7-0f68-7923-9b5c-cf342c8780e7/exec-d3d1e038-2d98-42a0-9994-90b3f0e3e850.png`。

参照: `public/assets/science-walk-v2.png`（キャラクター・画風の参照）。

実画像は **1774 × 887 px**、4 列 × 2 行の 8 コマ。マゼンタ背景は既存ローダーのクロマキーで除去する。膝が崩れる → 片膝 → 両膝 → 手をついて倒れる → 横倒しで静止。最終コマで停止し、ループしない。KO 用の被弾輪郭は不要。

既存ローダーは各コマの不透明領域の最下点を足元にそろえる。下記 scale では先頭コマ約 142 px 高、横倒し約 144 px 幅となり、192 px セル内に収まる。画像の目視検査では隣の人物はクロップに入っていない。

## extraSheet descriptor

```json
{
  "source": "/assets/science-ko.png",
  "scale": 0.4,
  "frames": [
    [
      0,
      0,
      443,
      444,
      221
    ],
    [
      443,
      0,
      444,
      444,
      221
    ],
    [
      887,
      0,
      443,
      444,
      221
    ],
    [
      1330,
      0,
      444,
      444,
      221
    ],
    [
      0,
      444,
      443,
      443,
      221
    ],
    [
      443,
      444,
      444,
      443,
      221
    ],
    [
      887,
      444,
      443,
      443,
      221
    ],
    [
      1330,
      444,
      444,
      443,
      221
    ]
  ]
}
```

推奨再生: 先頭から 8 コマを各 6～7 tick で一度だけ再生し、最後を保持。

## 最終プロンプト

Use case: stylized-concept. Asset type: 8-frame KO collapse sprite sheet for a side-view pixel fighting game. Image 1 is character/style reference ONLY. Generate exactly the same adult science teacher: green ponytail, glasses, white lab coat, teal shirt, black skirt, black thigh stockings, gloves, green shoes, beaker. Exactly FOUR columns by TWO rows, eight equal 384x384 cells, canvas1536x768. Read left to right top then bottom: 1 standing recoiling in defeat facing RIGHT knees just buckle, 2 knees bend and shoulders drop, 3 one knee touches ground, 4 both knees down torso folds, 5 right hand braces ground while torso falls to RIGHT, 6 elbow bends and hip touches ground, 7 lies on side head on right legs on left, 8 same side-lying unconscious pose relaxed and settled. Progressive natural collapse, no bounce, no recovery, no gore. Single character per cell full body entirely inside cell. Same anatomical scale throughout: upright equivalent height 280px, final horizontal body less than320px wide, fixed floor baseline y350 per cell, ample 24px margins; center body near horizontal center, never clip hair or shoes. Pixel art crisp stepped pixels limited palette matching reference, not smooth painting. Background uniform PURE MAGENTA #FF00FF for chromakey, no floor/shadows, no grid, no numbers, no text, no checkerboard.
