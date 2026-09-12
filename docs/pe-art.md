# PE animation artwork

Generated with the built-in imagegen tool, 2026-09-08. Reference identity: `characters/pe.jpg`. All four PNGs are 1024 × 1536, 24 frames each, magenta chroma-key background. The yellow flag was reduced to a small sports flag to fit each animation cell.

## Sheet layout and crop recommendations

Frames are read left to right, then top to bottom. Each motion spans eight frames (two rows). Use independent row boundaries rather than assuming 256-pixel-high cells; generated rows drift.

| File in public/assets | Motions | Row boundaries (y) |
| --- | --- | --- |
| pe-movement.png | idle, forward, backward | 0, 264, 522, 777, 1031, 1279, 1536 |
| pe-defense.png | guard, crouch, hit | 0, 292, 575, 788, 998, 1270, 1536 |
| pe-combat.png | jump, normal attack, air attack | 0, 280, 550, 831, 1090, 1300, 1536 |
| pe-finish.png | crouch attack, KO collapse, crouch guard | 0, 300, 550, 820, 1040, 1290, 1536 |

Most columns use x = 0, 256, 512, 768 and width 256. Combat frame12 (fourth row, first column) extends slightly to x276; use x0,width290, and start frame13 at x290 to preserve its aura without touching the next body. Finish frame4 extends to x258; use width272, next frame starts272. KO frame14 flag reaches x506, so its crop can start500,width268. These are visual inspection recommendations; runtime crop checks still needed. Standing sprites are approximately 230px tall in movement, 240px in defense, 230px in combat. Suggested sheet scales for ~150px gameplay body height: movement .65, defense .625, combat .65, finish .65. Preserve natural lower height of crouch and collapse rather than normalizing every frame's bounding box to standing height.

Generation provenance folder: `/Users/taiyo/.codex/generated_images/01a07e71-a520-7ea0-a554-ce54a9abef46`.

- movement: exec-d97786aa-20e9-4d36-b25e-1aa0c1fabe7b.png
- defense: exec-627d420c-0dca-4e9d-ba0c-517b6ba13699.png
- combat: exec-29735f8a-06db-4553-918b-3f6771266ca3.png
- finish: exec-92bb5c8d-f98e-4ee0-ac92-fa4ff38c0f7e.png

## Final prompts

### Movement

Use case: stylized-concept. Create production pixel-art fighting game movement sprites of the PE teacher in the attached character reference. Preserve tan skin, adult slim-muscular athletic male, short dark buzz cut, turquoise-blue polo with white shoulder panels, navy shorts, silver-white futuristic shin armor and turquoise running shoes. Hold a SMALL yellow triangular sports flag, short pole inside each sprite. Crisp limited-palette 1990s fighting-game pixel art, full body, all facing RIGHT. EXACTLY 24 frames in four columns and six rows, 1024x1536 canvas, each cell256x256. Every standing body210px tall, hip horizontal registration128, feet baseline240. Pure solid magenta #ff00ff background, no shadows, no text, no grid, no checkerboard. Rows1-2 eight frames idle breathing fight stance with subtle knee bend. Rows3-4 eight frames forward walk: right foot forward contact, down, passing, up, left foot forward contact, down, passing, up. Feet actually exchange places, stable torso scale. Rows5-6 eight frames BACKWARD walk while facing right, defensive weight back, alternating steps. Anatomy and size identical all frames, at least12px padding each cell, no adjacent overlap. Flag fits completely inside cell, never oversized banner. No projectile effects.

### Defense

Create second PE teacher sprite sheet matching the LAST generated movement sheet exactly: tan adult athletic male short dark buzzcut, turquoise blue polo white shoulder panels, navy shorts, white/silver shin armor turquoise sneakers, SMALL yellow sports flag. Crisp actual PIXEL art limited palette. Exactly4columns6rows24frames1024x1536 equal256cells. All face RIGHT fixed anatomy standing-equivalent210px, hip x128 feetbaseline240 in everycell; crouching bent limbs naturallyshorter. Solid magenta #ff00ff no text/grid/shadows. Rows1-2 8-frame standing GUARD, raise forearms protecting head/chest, flex knees, brace impact then settle. Rows3-4 8-frame CROUCH: bend knees into squat, hold low crouch, subtle breathing, remaincrouched. Rows5-6 8-frame HIT RECOIL: flinch torso backwards from blow from RIGHT, face wince, shoulders back, stagger and recover. Arms legs flag insidecell12pxpadding. Maintain recognizable reference face/outfit colors unchanged, don't face left or turn back.

### Combat

Third sprite sheet SAME PE teacher as previous two sheets. Adult athletic tan man buzzcut blue-white polo navy shorts silver white shin armor blue running shoes SMALL yellow sports flag. Genuine crisp limitedpalette PIXEL ART. Exactly4cols6rows24frames1024x1536. Fixed256squarecells fullfigureallRIGHT-facing. Original anatomy scale standing210px, footbaseline240, torso horizontalanchor128. Magenta#ff00ff background no grid text ground shadow. ROWS1-2 eight JUMP frames: low takeoff squat, push-off extension, knees rising, knees tucked apex, tuck with forward lean, legs descending, landing bentknees, uprightrecovery. Character worldheight handledbygame no spatialmovement acrosscells. ROWS3-4 eight GROUND AURA ATTACK frames: prepare shoulders back; pull flag near chest; windup; thrust flag hand RIGHT; strong rightward extension with tiny golden aura nearhand; hold extension; recoil; return stance. ROWS5-6 eight AIR AURA ATTACK frames: airborne tuckedknees windup; pullback; thrust flag diagonally down-right; full extension tinygoldaura; hold; recoil; tuck; descentknees. Same body size everypose, flag fully inside eachcell at least12pxedgepadding. No detached projectiles, no explosions. Significant readable pose changes.

### Finish

Final PE teacher fightinggame sprite sheet matching same tan adult athletic buzzcut male, turquoise blue and white sports polo, navy shorts, silver white shin armor blue sneakers SMALL yellow sports flag of last sheets. Genuine PIXEL ART crisp limitedpalette. EXACTLY24frames4columns6rows1024x1536, equal256cells. All face RIGHT with fixed anatomy scale equivalent standing210px; horizontalanchor128feetbaseline240; pose height naturallydifferent, never shrink body. Uniformsolidmagenta#ff00ff no textgridshadow. Rows1-2 eight CROUCH AURA ATTACK frames: low squat windup, drawflagback, thrust flagforwardRIGHT while remaining low, full extension with tinygoldaura atflag, hold, recoil, settlecrouch. Rows3-4 eight KO COLLAPSE frames sequentially: chest recoils back; kneesbuckle; dropone knee; bothkneesbodyforward; fall sidewards; upperbodynowonground; lie still sideways withlegs bent; fullycollapsed lyingmotionless. Must show genuine progressive collapse and end flat ground, no gore. Rows5-6 eight CROUCH GUARD frames: deeplybentknees low squat, forearmcoveringfaceandchest, tensebrace and slight recoil then settle. Whole body and flag remaininsideeachcell minimum12pxpadding, horizontalfallenpose width<=232px. No detached projectile.

