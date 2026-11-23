# Spellcaster Web Game

## 1. Product overview

Spellcaster is a stationary, first-person wizard duel game for desktop and touch browsers. Players draw elemental runes to block incoming spells and cast their own. Each win advances an endless run against opponents whose difficulty increases with score.

The game is for players who can use a mouse, stylus, or touchscreen and want a short, replayable challenge. Rune recognition is the core interaction. The element recognized from a drawing determines the spell or counter applied to the current turn.

## 2. Player journey

1. Enter a display name, then complete or skip a tutorial showing the five continuous stroke paths, the counter cycle, and turn controls.
2. Start a run after the model is loaded and warmed up. The game assigns one random player element for the run and independently assigns a random enemy element for each duel. The player starts each duel at 100 HP. Enemy health starts at 3 HP and increases with the run score to 20 HP.
3. Watch the enemy throw spells one at a time. Draw counters in that order. The counter list highlights the current spell.
4. If the player survives, draw attack runes one at a time. Each recognized stroke flies when released and resolves before the next stroke.
5. On victory, see the points earned and choose the next duel or end and save the run. On defeat, see the final score, wins, and highest level encountered. View rankings under **On this device**.

## 3. Webpage layout

| Area | Required content and controls |
| --- | --- |
| Start screen | An announcement at the top invites players to press a key. Clicking the arena also starts play. Align How to play, Rankings, and Fullscreen at the bottom. Show loading status and a retry button when needed. The Rankings screen includes the display name field. |
| Combat viewport | Pixelated 3D arena, elemental wizard, enemy HP, incoming runes, a centered wand and crosshair, and first-person mouse look. Draw runes with the crosshair and show casts traveling toward the opponent. |
| Duel HUD | The player's animated 3D head, compact segmented health bars with pixel icons for both wizards, and the counter spell list. Select the portrait to pause. |
| Counter list | Each spell and its counter use pixel icons and names. Highlight the current incoming spell during defense. |
| Results | Duel points and continue/end choices on victory, or run summary and restart on defeat |

During the preview, the enemy throws one rune at a time in the same order used to resolve counters. The first defense window starts after the final preview flight. With reduced motion, runes appear in sequence at a fixed position.

Use the supplied arena and wizard poses. Retain sprite proportions and align feet across poses. Keep the canvas usable on touchscreens and provide landscape guidance where space is limited. Label controls and communicate elements, timer state, and damage with text or symbols alongside color.

## 4. Rune input and recognition

- One pointer-down, movement, and pointer-up gesture forms one rune. Capture mouse, stylus, and touch input on the canvas. Clear or cancel discards the current stroke.
- Ignore taps and near-empty strokes. Show a retry prompt for rejected strokes. Lock input while recognition, flight, or impact is in progress. Show the player's drawn shape as the projectile.
- On timeout, discard strokes still held down. Allow pending inference for a stroke released before the deadline to finish without reopening input. Associate inference results with the originating run and turn. A result from an invalidated turn cannot alter the current game.
- Train the compact CNN with 5,000 unique 28 × 28 Fire outlines extracted from individual strokes in Google Quick, Draw! campfire sketches. Select strokes with pointed tips and rounded bases and omit separate logs and marks. Use 4,000 for training and 500 each for validation and testing. Preserve the original splits for Water, Earth, Wind, and Lightning, and add 480 perturbed HUD icon traces per non-Fire class to training. The current checkpoint scored 99.24% on the 2,500 held-out samples and correctly classified all 500 held-out Fire outlines. In-game recognition rates for real player drawings remain to be measured.
- Export the checkpoint to ONNX and run it with ONNX Runtime Web. Input is a float32 grayscale tensor of shape `[1, 1, 28, 28]` with bright strokes and values scaled to `[0, 1]`. Output is five logits in exact order `fire, water, earth, wind, lightning`. Apply softmax for scores.
- Center and scale the stroke to a 76-pixel span on a 112 × 112 canvas, use an 8-pixel round stroke, and downsample to 28 × 28 by averaging each 4 × 4 block. Use a provisional 0.60 confidence cutoff. Validate the preprocessing and calibrate rejection with real player drawings, including incomplete and unrelated strokes.

## 5. Combat and progression

The game's `lib/spellcaster-rules.json` is authoritative for starting HP, counters, damage, score, and difficulty.

| Incoming rune | Required counter |
| --- | --- |
| Fire | Water |
| Water | Lightning |
| Lightning | Earth |
| Earth | Wind |
| Wind | Fire |

- Resolve one spell after each stroke flies. A correct defensive rune blocks the current enemy spell. A wrong rune or timeout deals damage from that enemy element before the next drawing window opens. The enemy can counter each player attack individually.
- Give each rune its own input window of secondsPerRune. A recognized stroke released within the window casts automatically. A missed attack window skips that spell.
- On player attack, the enemy rolls its level's defense error independently for each rune. On an error it picks uniformly among the four incorrect counters. Show the resulting counter sequence before resolution.
- Select the highest unlocked level at the next duel. Keep the level fixed during each duel. The ten levels use the handoff's exact score thresholds, sequence grammar, timing, error probabilities, and weakness weights. Early levels use one rune and late levels use five.
- Set the enemy's maximum and starting HP at duel creation to `3 + floor(17 × clamp(score / 4500, 0, 1))`. Keep that maximum fixed throughout the duel. The health bars use each combatant's own maximum.
- Count consecutive successful individual guards across duels. Taking damage resets the streak. At 2, 3, 4, 5, 6, and 7 guards, show “Focused!” on the left and play an impact cue. The label, wand jewel, and light progress through white, yellow, orange, red, light green, and blue. Each tier makes the halo larger and brighter and casts stronger colored light onto the wand and grip.
- Increase base damage per landed spell to 2, 3, 4, 5, 6, or 7 at those tiers. Apply the usual elemental weakness multiplier. At 6 and 7 guards, successful enemy counters shatter in a burst of fragments with a shatter cue, and the spell deals damage with its elemental impact and the opponent's hurt or elimination animation. Cap the streak at 7.
- Award points once per victory using `100 × enemy level + 2 × remaining HP + 10 × min(perfect defense turns, 10)`. Count a perfect defense only when every incoming attack is blocked. Reset that count each duel and restore HP to 100 before the next duel. A defeat or voluntary end adds no victory points.
- Pause on Escape or when the tab becomes hidden. Freeze the phase clock and lock drawing. Resume explicitly with the time remaining. Lock game controls during damage resolution and guard against duplicate or stale events.
- Play distinct sound effects for Lightning, Fire, Water, Earth, and Wind when either wizard casts. Play a damage thud when a hit deals damage and a blocking chime when a counter succeeds. A sequence with both outcomes can play both cues. Initialize Web Audio on the player's start action and allow play when audio is unavailable.

## 6. Data and technical design

Use the existing Next.js project, CSS for the arena and HUD, Pointer Events and Canvas for drawing, and a client-side turn state machine. The browser canvas prepares a tensor for the model. The classifier returns the rune ID, and rule-driven combat converts it into a counter or attack. Bundle the trained model and gameplay assets for static delivery. Use the local `model/` notebook and checkpoint as the model export source.

Save one local leaderboard record per ended run. Store run ID, display name, score, wins, highest encountered level, player element, completion timestamp, and rule/model versions. Trim the name, cap it at 20 visible characters, and render it as text. Sort by score descending, wins descending, highest level descending, and earliest completion. Identify local rankings as **On this device**. Handle unavailable storage without losing the on-screen run summary.

Target the project's Vercel deployment for the finished site. Verify that the model and runtime assets load in the deployed environment. The handoff's pose switches are the first release's animation assets. Consider a Web Worker if measured inference stalls drawing. Browser performance, recognition on human-drawn synthetic-source classes, and late-level timing are the main playtest risks.

## 7. Release scope

**Required** includes tutorial, single-stroke CNN inference, playable duels, score-based enemy health, combat audio, difficulty progression, feedback, pause/resume, restart, and local rankings.

**Deferred** includes player movement, fusion spells, polished multi-frame animation, and online rankings. Any future competitive ranking needs trusted server-side submission and validation.

## 8. Acceptance criteria

| Area | Pass condition |
| --- | --- |
| Start and tutorial | Players can learn or skip rune paths and counters. Model load and warmup finish before timed play. Failures show a retry control. |
| Drawing | A real single stroke produces a CNN classification in the correct slot. Taps, canceled strokes, and strokes incomplete at the deadline leave the slot empty. A late result from an old turn cannot affect the next one. |
| Combat | All five counter mappings, mixed correct and incorrect slots, player and enemy damage values, weakness damage, and HP clamping match the current rules. Damage and score apply once even with repeated clicks or restart during transitions. |
| Timing | Preview lasts 1.2 seconds before the full defense window. Deadline behavior, early Cast, hidden-tab pause, and explicit resume preserve turn boundaries. |
| Progression | Test every inclusive level threshold, the structured grammars, weakness weighting, player healing to 100 HP, enemy health rising from 3 to 20 HP by 4,500 points, and the cap of ten perfect-defense bonuses. |
| Audio | Each elemental cast has a distinct cue. Damage and successful blocks have separate cues. Repeated renders and pause/resume do not replay cues for the same turn. Gameplay is usable without audio. |
| Results | Defeat and quit-and-save each persist one run record. Refresh preserves the local leaderboard and its specified tie order. |
| Browser and model | Verify mouse and touch input, small-screen layout, ONNX/PyTorch output parity, human-drawn recognition by class, and measured capture-to-prediction latency. Record observed rejection and error rates before setting a release threshold. |

## References

- [Spellcaster game design plan](Spellcaster_Design_Plan.md)
- [Game handoff with rules, assets, and dataset report](Spellcaster_Game_Handoff.zip)
- [Project guide, section 2.4](final-project-task1_2.pdf)
- [Executed training notebook](model/Spellcaster_Rune_CNN.ipynb)
- [QuickDraw campfire Fire dataset](model/campfire_flames_28x28.npz)
