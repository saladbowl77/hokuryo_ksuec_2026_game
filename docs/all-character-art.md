# 全キャラのアニメーション素材

作業ディレクトリ: `/Users/taiyo/Desktop/大学/eleClub/26/hokuryo_game`。
原画のある理科・数学・英語・社会・体育をゲームに登録しています。国語 (ID 3) は原画がまだないため準備待ちです。

## 保存内容

- `public/assets/math-{movement,defense,combat,finish}.png`
- `public/assets/english-{movement,defense,combat,finish}.png`
- `public/assets/social-{movement,defense,combat,finish}.png`
- `public/assets/pe-{movement,defense,combat,finish}.png`
- `public/assets/science-defense.png`（既存の理科画像に追加）

数学・英語・社会・体育は各96フレーム分のインデックス。理科は既存96フレーム＋追加24フレーム。KOには判定を設定しません。
画像生成は imagegen スキルの built-in image_gen を使用。元絵は `characters/` に保持しています。

| ファイル群 | 収録する動作（各8フレーム分） |
| --- | --- |
| movement | 待機、前進、後退 |
| defense | ガード、しゃがみ、被弾 |
| combat | ジャンプ（踏み切り・空中・着地）、地上攻撃、空中攻撃 |
| finish | 近接はスライド／遠距離はしゃがみ攻撃、KO、しゃがみガード |

## 組み込み

`src/sprite-packs/<key>.json` が画像・コマの切り抜き位置・基準点・倍率・アニメーションの対応を定義します。
`src/sprite-registry.ts` が全キャラを登録します。理科の追加分は `science-extra.json` から読み込みます。

`docs/<key>-body-landmarks.json` は各画像を目視して個別に記録した体の点を結ぶ多角形です。髪・帽子・武器・服の裾を除き、服で隠れた体は手動で推定しています。ピクセル完全一致の自動抽出ではありません。
`scripts/compile-hurtboxes.mjs` が、ゲームのクロマキー除去と同じ計算で足元・倍率を合わせ、`src/hurtboxes/<key>.json` に保存します。

開発サーバーを起動後に再生成する例:

```sh
GAME_URL=http://127.0.0.1:5175 node scripts/compile-hurtboxes.mjs math english social pe science
```

「モーション確認」でキャラ・動作を選び、速度変更、左右反転、コマ送り、体の判定の重ね表示ができます。歩行は移動速度と独立した10fps。KOは一度だけ再生し最後を保持します。

## 素材について

生成コマには似た姿勢が含まれます。社会のKOは7種類の姿勢＋最後の姿勢の保持で8フレーム分にしています。英語のしゃがみや数学のしゃがみ攻撃は、途中で立ち上がる生成コマを再生列から除外しています。各動作の8インデックスがすべて別の姿勢という意味ではありません。

体型・足元・腕の連続性は今後も各ファイルで微調整できます。国語追加時も同じ4シート、sprite-pack、body-landmarksを用意すれば追加できます。原画なしで国語の容姿は決めていません。

英語・体育のプロンプトは `english-art.md`、`pe-art.md`、理科KOは `science-ko-art.md` を参照。

## 数学・理科追加分の最終生成プロンプト

### 数学 movement

Use case: stylized-concept. Generate game-ready PIXEL ART mathematics teacher animation atlas. Image 1: identity reference (slim adult male wavy dark blue-black hair, gray button shirt rolled sleeves, dark tie, red lanyard, navy trousers, brown shoes, triangular blue set-square held in right hand). Image 2: pixel style only (do not copy woman). EXACT 8 COLUMNS x3 ROWS =24 full-body sprites, canvas2048x768, each cell256x256. Row1 eight distinct idle breathing poses. Row2 eight FORWARD walking frames facing RIGHT: alternate leading leg, heel contact, down, passing, up then opposite contact/down/pass/up. Row3 eight BACKWARD walking frames facing RIGHT throughout, reverse foot sequence and defensive arms. Every frame has same male identity/clothes/scale, standing body200px tall, feet baseline y236 inside eachcell, pelvis horizontally centered x128, no drift. Fixed side view facing RIGHT all24frames. Held small set square fits cell, no floating equations. Crisp 1990s fighting game pixel art: hard pixel edges, no smooth painting, no antialias. Pure flat MAGENTA #FF00FF background, no grid, no shadows, no text/numbers, no checkerboard. Leave20px clean space around every sprite so adjacent sprites never overlap. This is ONE sheet with exactly3 rows each8 sprites; do not omit any sprites.

### 数学 defense

Generate the SAME mathematics teacher from previous atlas, same exact crisp pixelart body size and rendering: wavy dark blue-black hair, gray rolled-sleeve shirt dark tie red lanyard navy trousers brown shoes small triangular blue set square. ONE atlas EXACT 8 columns and3 rows,2048x768,24 sprites total,256square equal cells,20px blank padding. Every character faces RIGHT. Pure uniform MAGENTA background #FF00FF. No labels no grid no shadows. Row1 eight GUARD frames arms raised protecting head and chest holding small triangle, knees slightly bent subtle recoil and recover. Row2 eight CROUCH frames: settle low bent knees squat, weight shifts and breathing, hands in frontchest. Row3 eight HIT REACTION frames: standing wince head/chest recoils BACKWARDS to left, arm opens, knees buckle slightly, then recover to ready. NOT KO, remains on feet. Retain same anatomy scale as prior sheet:200px standing height, feetbaseline236 within EVERY cell; crouches naturally shorten not shrink. Feet and figure centered atx128. Every row exactly8frames.

### 数学 combat

Use previous math teacher sheet as EXACT identity and pixel style reference. ONE sprite sheet EXACT 8 columns x3 rows,24 images in2048x768 canvas,256squarecells. Same slim adult male dark wavy hair gray shirt red lanyard dark tie dark pants brown shoes with a BLUE TRIANGULAR SET SQUARE. All faceRIGHT, same anatomical200px standingheight, baseline236, fullbody insidecell, MAGENTA #ff00ff no grid no labels no shadows. CRITICAL each row is a PROGRESSIVE ACTION sequence not repeatedposes. ROW1 JUMP eight successive poses:1deep knee bend2takeoff push toes3rising legs begin tuck4both knees tucked high5legs extend for descent6falling legs down7landing squat8stand. ROW2 GROUND THROW eight successive poses:1ready2draw triangle back shoulder3torso twists windup4arm thrusts forward RELEASE5empty throwing hand fully extends6followthrough7hand withdraws8ready with triangle. Do not draw detached projectile in cells. ROW3 AIR THROW eight successive poses:1airborne knees tucked2triangle drawn back3twistmidair4throwingarm extends diagonallydownright5release emptyhand6recoil7tuckknees8preparelanding. Clearly different arm and leg silhouettes each successive action pose. Keep triangle small and no duplicates in samecell.

### 数学 finish

Same mathematics male teacher EXACT identity/pixelart/scale as previous atlas. Create exactly8columns3rows=24sprites,2048x768canvas each256cell, flat MAGENTA #ff00ff background. Grayshirt redlanyard darktie darkpants brownhair navy blackwavyhair brownshoes, small blue triangle. All facingRIGHT, fixedbody200px standingheight, feetbaseline236, pelviscenter128, leaveblankpadding. Row1 eight progressive CROUCH THROW poses:1low squat ready2pull triangleback3windup4throw forward low5emptyhand full extension6recoil7withdraw8ready. Row2 eight KO COLLAPSE poses:1standing hurt knees buckle2knees bend3one knee4bothknees5hand supportsbody6hip falls7lies completely flat onside headright feetleft8samefullyfallenrelaxed hold. Row3 eight CROUCH GUARD poses:1low squat handsraise2protecthead3brace4absorb5leanbackslightly6recover7hold8hold; keep actual headlower thanstanding. Every motion consistent anatomy, no growing/shrinking, no extrafigures, no numbers no labels no grid no floor shadows no detached projectile. Pixelhardedges samepalette.

### 理科 defense

Use reference EXACT adult female science teacher identity and crisppixelstyle: GREEN high ponytail redhairpin glasses white labcoat teal shirt blackskirt black stockings gloves green shoes holds small beaker. Create8columns3rows24frames atlas2048x768,eachcell256square. Puremagenta#ff00ff background,no text no grid no shadows no floor. All faceRIGHT, standing anatomy200px high, footbaseline236, pelvisx128, fullbodyinsidecell20pxmargin. Row1 EIGHT successive HIT REACTION:1normal ready2head jerks back3shoulders recoil4torso recoils back left armopens5knees wobble6brace7recover8ready. Row2 EIGHT standing GUARD:1handsraise2cover face3arms tight4impact slight leanback5brace6recover7hold8hold. Row3 EIGHT CROUCH GUARD:1deep low squat hands protect head2brace3impact recoil4lean back low5recover6hold7hold8hold. Always actualbentknees never shrinkwholeperson. Beaker remains smallheld, characteranatomy neverchanges. Preserve SAME greenponytailwoman not any male. Pixelart hardedgedarcade sprites. Eightframes perrow explicitly, with progressivearm poses.
