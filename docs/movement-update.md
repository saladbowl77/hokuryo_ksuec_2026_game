# 歩行・低姿勢・空中攻撃の追加

スライドは近接限定。全員の歩行速度を2倍にし、ジャンプ距離は維持。
理科の新規ラスター素材は imagegen スキルで参照画像から生成しました。
生成結果には手元や衣服のコマ間差が残るため、完成原画ではなく調整可能な初稿です。

## 歩行素材

保存先: `public/assets/science-walk-v2.png`

最終プロンプト:

Create a corrected WALK CYCLE sprite sheet for the exact science teacher reference, green ponytail glasses white coat teal shirt black skirt stockings gloves shoes beaker. Genuine crisp pixel art same scale as reference. EXACT 4 columns x4 rows=16 sprites. Full body, all face RIGHT. Solid pure magenta background #FF00FF. First two rows 8 frames FORWARD walking: 1 right foot forward heel strike left leg back, 2 right foot plants left lifts, 3 legs pass under hips left knee raised, 4 left foot swings forward, 5 LEFT foot forward heel strike right leg back, 6 left foot plants right lifts, 7 legs pass under hips right knee raised, 8 right foot swings forward. Last two rows 8 frames BACKWARD defensive walk facing right: distinct reverse stepping cycle with feet alternating, knees bent, torso slightly leaning back, arms raised. Front leg and back leg must actually swap places during cycle. No identical poses. Keep torso horizontal registration identical, same body scale and foot-ground baseline each cell. No size changes. 4x4 equal square cells; 1024x1024, 256 per cell, standing figure 210 pixels tall feet baseline240. Hair and coat kept inside cell. Beaker held in one hand always. No labels no grid no checkerboard.

## しゃがみ・スライド・空中攻撃素材

保存先: `public/assets/science-actions.png`

最終プロンプト:

Create an action sprite sheet of the same adult green ponytail glasses SCIENCE teacher pixel fighter from reference, white labcoat teal shirt black skirt black stockings gloves green shoes with beaker. Four columns and six rows EXACTLY, 24 full-body frames. Uniform magenta #ff00ff background. Rows1-2: eight frames crouch down, hold a low squat, weight shifts, hands and beaker near chest; actual bent knees, never scaled-down standing pose. Rows3-4: eight frames sliding kick attack facing RIGHT: crouch windup, extend right leg along ground, low forward slide with fully extended front leg and rear leg bent, then recover to crouch. Rows5-6: eight frames AIR ATTACK facing RIGHT: tucked knees airborne, windup holding beaker, punch beaker diagonally down-forward, full extension diagonally down, recoil, tuck. Keep same anatomical scale in all frames. Each cell 256x256, canvas1024x1536. Standing equivalent height210px, generous padding, no clipping or overlaps. Crouching figures naturally shorter, don't change anatomical size. Crisp limited palette 90s arcade PIXEL art, NO smooth painting, NO text, NO labels, NO checkerboard. Preserve character identity and single beaker throughout.
