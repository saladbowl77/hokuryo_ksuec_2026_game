# キャラ素材の生成・追加

## 前進・後退・ガード追加

組み込みimagegenで24コマを生成し、`public/assets/science-walk-guard.png`（1024×1536）に保存。前進24〜31、後退32〜39、ガード40〜47として既存アトラスへ追記しました。前進・後退はループし、ガードは受け止めた時点から再生します。「理科のモーション」で各8コマを個別に確認できます。生成画像の行間は不均一なので、JSONの矩形で各行を切り出しています。

使用プロンプト：

Create a production pixel art animation sprite sheet for the EXACT same science teacher in reference: green ponytail, glasses, white labcoat, teal shirt, black skirt and stockings, blue gloves, green shoes, holding a beaker. 24 full body sprites in EXACTLY FOUR columns and SIX rows, equal cells. Solid uniform pure magenta #FF00FF background, no checkerboard, no labels. Each cell has generous padding. All figures face RIGHT with same anatomical size and same foot baseline. Rows 1 and 2: EIGHT sequential FORWARD WALK frames, alternate legs, stepping right, weight shift, knees bend, coat and ponytail swing. Rows 3 and 4: EIGHT sequential BACKWARD defensive WALK frames facing right while stepping left, knees bent, arms held up in a defensive stance, distinct footwork. Rows 5 and 6: EIGHT sequential GUARD IMPACT frames: planted wide feet, elbows lifted protecting face and torso, beaker held securely, recoil backward then recover to blocking stance. Clearly distinct poses with genuine joint movement, NOT eight duplicated idle poses. Authentic crisp 1990s fighting game pixel art, same style and adult proportions as reference. EXACT 4x6 layout. Each square cell 256x256, canvas1024x1536. Standing character height about210px in every cell, feet at y240. Entire body and ponytail contained in each cell. No cell overlaps.

## ジャンプ追加・全画面UI改訂

`public/assets/science-jump.png` にimagegen組み込みツールで生成した8コマを保存。踏み切り2コマ、上昇・頂点、前ジャンプ、後ろジャンプ、下降、着地を追加しました。`src/sprites.json` のextraSheetsで既存シートへ追記し、ゲーム中は垂直速度・ジャンプ方向・着地状態で選択します。実寸1774×887。原画との質感差と輪郭のマゼンタ残りは引き続き初稿の調整対象です。

使用プロンプト：

Create a new JUMP animation sprite sheet for exactly the same green ponytail science teacher from reference. Keep pixel art style, glasses, white labcoat, black skirt, stockings, gloves, green shoes and held beaker. Eight clearly DISTINCT full body poses, arranged EXACTLY 4 columns by 2 rows in equal square cells. Solid pure magenta #FF00FF background, NO checkerboard, NO text. Row 1: deep crouch anticipation, upward push-off legs extending, ascending jump both knees bent, apex tuck knees lifted high. Row 2: forward jump compact tucked legs and flowing coat, backward jump tucked knees leaning back, descending with feet extended, low landing crouch. Faces right in all frames; adult arcade fighter proportions; each figure fully inside own cell with generous padding. Cell size 384x384, total 1536x768. Figures same anatomical scale, standing height equivalent 290 pixels; feet near bottom when extended. Real joint changes, bent knees, flowing ponytail and coat. Crisp limited palette 90s fighting game pixel art. No duplicated idle poses. Beaker kept in hand.

UI参考：ユーザー指定で画像検索した [Street Fighter IIの選択画面](https://gnn.gamer.com.tw/detail.php?sn=148317) と [対戦画面](https://www.gametoc.co.kr/news/articleView.html?idxno=48626)。画面配置・配色の参考として使用し、画像自体はゲームへ同梱していません。

## 現在の確認ポイント

imagegenの組み込みツールで理科を生成。初稿は絵柄とモーション方向のレビュー用です。細部のビーカーが途中で消える／形が変わる、攻撃後半が待機に近く戻りが急、歩行など残り8モーション未制作という制限があります。全員へ展開する前に理科の等身、ドットの密度、攻撃の見え方を確認してください。

保存済み画像：

- `public/assets/science-review.png`：最初の2行案。コマ割り不均一で不採用。
- `public/assets/science-review-v2.png`：4×4の16コマ案。背景に市松模様が描かれたため、そのままゲームには使用しない。
- `public/assets/science-keyed.png`：背景のみマゼンタへ修正した使用中のシート。

現在のツール出力は要求した透過PNGにならなかったため、最後に背景を単色へ変更し、ゲームのテクスチャ読み込みでクロマキーを適用しています。原画・生成画像は書き換えません。透明化は表示用のメモリ内テクスチャのみです。生成時に指定した寸法・整列は保証されないため、実寸1254×1254に合わせた切り出し矩形を `src/assets.ts` に明示しています。

## 追加手順

1. 原画を `characters/` に追加。国語は `japanese.png` を推奨。ID 3は変更しない。
2. その原画を画像生成ツールで参照し、承認済み理科スプライトも絵柄の参照に使う。まず待機と攻撃を作る。
3. キャラの顔・服・武器を維持して、各モーションを個別に8コマ生成。横向き右、同じ等身、足元基準、隣のコマとの重なりなしを指定。
4. 待機・前進・後退・ジャンプ・地上攻撃・空中攻撃・ガード・被弾・KO・勝利を揃える。国語・理科・社会は武器を手放さず近接、数学・英語・体育は遠距離。左右はゲーム内で反転する。
5. 生成結果の実寸とコマ数、武器の保持、透過を目視確認。必要ならツールで部分修正する。切り出し矩形と足元基準を登録し、プレビューで確認。
6. `src/sprites.json` にキャラのkeyを追加し、source、chromaKey、scale、frames、animationsを登録。framesは `[x,y,width,height,横方向の体の基準位置]`。animationsはidle、forward、backward、jump、attack、airAttack、guard、hit、koを使用。未登録のモーションはidleまたはattackへフォールバックする。原画参照は `src/assets.ts` のportraitsへ追加し、`src/character_stats.json` の `available` をtrueへ変更。描画・戦闘・通信の分岐追加は不要。

## プロンプトセット（今回使用）

### 初回

Create a production sprite sheet from the reference science teacher, preserving green ponytail, glasses, white lab coat, teal top, black skirt and stockings, green shoes, blue gloves, beaker. Authentic detailed 1990s arcade fighting game pixel art, adult proportions, crisp pixel clusters, limited palette, no smooth painting. Exactly 16 full-body sprites in an EXACT 8 column by 2 row evenly spaced grid. Canvas 2048x768, each cell 256x384. Transparent background actual alpha, no text, no grid lines, no shadows. Every figure faces RIGHT in side-view fighting stance, feet aligned at same baseline 350 pixels into its cell, same scale, entire body and weapon inside each cell. Top row: eight sequential idle breathing frames with subtle coat and ponytail movement. Bottom row: eight sequential melee attack frames, wind up with beaker in right hand then strike forward with beaker, fully extended strike in frames 4 and 5, retract and recover frames 6-8. Beaker remains held, never thrown. Keep character identity perfectly consistent across all 16 cells. Leave generous padding between silhouettes.

### コマ割り修正

Fix this sprite sheet for game use. Preserve precisely this green ponytail glasses science teacher pixel art character design and outfit. Need exactly SIXTEEN frames laid out in FOUR columns and FOUR rows, each equal-sized cell. First two rows are eight sequential idle breathing frames facing RIGHT. Last two rows are eight sequential beaker melee punch frames facing RIGHT (windup, windup, extend, fully extended hit, fully extended hit, retract, recover, idle). Each frame is entirely contained in its own cell including hair and fully extended arm. All feet at same cell-relative baseline; same character size. Actual transparent alpha background, absolutely NO painted checkerboard. If transparency impossible use perfectly uniform pure magenta #ff00ff background, no white or gray checks. NO labels, NO grid lines. Crisp 90s arcade pixel art. EXACT 4 by 4 regular grid on 1536 by 1536 canvas. Each cell 384x384. Keep full body height around 300 pixels and foot baseline 355 pixels. All 16 figures present, no figures touching adjacent cells.

### 背景修正

Edit only background. Replace ALL white and pale gray checkerboard background with FLAT SOLID PURE MAGENTA RGB 255,0,255 (#FF00FF). Do NOT use transparency. Absolutely no checkerboard left. Preserve all sixteen character sprites pixel perfectly, their white coats, positions, dimensions, spacing, 4x4 layout, all details. Solid vivid pure magenta fills entire empty space around every character. This is a chroma-key game sprite sheet.

## 次のキャラ用テンプレート

Input 1: original [SUBJECT] teacher design. Input 2: approved science pixel sprite for STYLE ONLY. Produce [MOTION] in eight sequential frames facing RIGHT, 4 columns by 2 rows. Preserve the identity, outfit and [WEAPON] from input 1. Same pixel density and adult proportions as input 2. Exact consistent foot baseline and generous empty cell padding. [ACTION DETAILS]. Actual transparent background; never paint checkerboard. No labels or text. Keep all body parts and weapon within each cell. Do not copy the science teacher's appearance.
