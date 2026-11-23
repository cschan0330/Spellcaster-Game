# Spellcaster Web Game

## 1. Product overview

Spellcaster is a stationary, first-person wizard duel game for desktop and touch browsers. Players draw elemental runes to block incoming spells and cast their own. Each win advances an endless run against opponents whose difficulty increases with score.

The game is for players who can use a mouse, stylus, or touchscreen and want a short, replayable challenge. Rune recognition is the core interaction. The element recognized from a drawing determines the spell or counter applied to the current turn.

## 2. Player journey

1. Optionally set a display name under Rankings. Open or skip the tutorial showing the five continuous stroke paths, the counter cycle, and turn controls.
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
- On player attack, the enemy rolls its level's defense error independently for each rune. On an error it picks uniformly among the four incorrect counters. Show the enemy ward when a correct counter is attempted.
- Select the highest unlocked level when the next duel starts and keep it fixed for that duel. The [rule configuration](lib/spellcaster-rules.json) defines the ten score thresholds, input windows, sequence patterns, and defense error probabilities.
- Player attacks deal 1 base damage before Focused. Enemy attacks deal 10 base damage. Double an unblocked hit if its element counters the target's innate element. Clamp HP at zero.
- Set the enemy's maximum and starting HP at duel creation to `3 + floor(17 × clamp(score / 4500, 0, 1))`. Keep that maximum fixed throughout the duel. The health bars use each combatant's own maximum.
- Count consecutive successful individual guards across duels. Taking damage resets the streak. At 2, 3, 4, 5, 6, and 7 guards, show “Focused!” on the left and play an impact cue. The label, wand jewel, and light progress through white, yellow, orange, red, light green, and blue. Each tier makes the halo larger and brighter and casts stronger colored light onto the wand and grip.
- Increase base damage per landed spell to 2, 3, 4, 5, 6, or 7 at those tiers. Apply the usual elemental weakness multiplier. At 6 and 7 guards, successful enemy counters shatter in a burst of fragments with a shatter cue, and the spell deals damage with its elemental impact and the opponent's hurt or elimination animation. Cap the streak at 7.
- Award points once per victory using `100 × enemy level + 2 × remaining HP + 10 × min(perfect defense turns, 10)`. Count a perfect defense only when every incoming attack is blocked. Reset that count each duel and restore HP to 100 before the next duel. A defeat or voluntary end adds no victory points.
- Pause on Escape or when the tab becomes hidden. Freeze the phase clock and lock drawing. Resume explicitly with the time remaining. Lock game controls during damage resolution and guard against duplicate or stale events.
- Play distinct sound effects for Lightning, Fire, Water, Earth, and Wind when either wizard casts. Play a damage thud when a hit deals damage and a blocking chime when a counter succeeds. A sequence with both outcomes can play both cues. Initialize Web Audio on the player's start action and allow play when audio is unavailable.

## 6. Data and technical design

Use the existing Next.js project, CSS for the arena and HUD, Pointer Events and Canvas for drawing, and a client-side turn state machine. The browser canvas prepares a tensor for the model. The classifier returns the rune ID, and rule-driven combat converts it into a counter or attack. Bundle the trained model and gameplay assets for static delivery. Use the local `model/` notebook and checkpoint as the model export source.

Save one local leaderboard record per ended run. Store run ID, display name, score, wins, highest encountered level, player element, completion timestamp, and rule/model versions. Trim the name, cap it at 20 visible characters, and render it as text. Sort by score descending, wins descending, highest level descending, and earliest completion. Identify local rankings as **On this device**. Handle unavailable storage without losing the on-screen run summary.

GitHub hosts the source and Vercel builds the application from the repository root with `npm ci` and `npm run build`. Production serves the Next.js page, Three.js assets, ONNX model, and runtime files. Canvas capture, inference, combat, and rankings run in the browser. The [public deployment](https://spellcastergame.vercel.app/) should open without instructor sign-in.

```text
GitHub source -> Vercel build -> Browser (Next.js, React, Three.js)
Pointer stroke -> Canvas raster -> ONNX Runtime Web -> Rune and confidence
Rune and confidence -> Combat state -> HUD, effects, and audio
Ended run -> localStorage -> On-device rankings
```

### Storage and privacy

| Browser key | Data and purpose |
| --- | --- |
| `spellcaster-runs-v1` | JSON array of completed runs. Store `id`, `name`, `score`, `wins`, `highest`, `player`, `completed`, `rulesVersion`, and `modelVersion`. Deduplicate by run ID. |
| `spellcaster-mouse-sensitivity` | Selected mouse sensitivity for the next session on this browser. |

Drawing data is processed locally and is not included in saved runs. The initial release needs no account, shared database, or Supabase connection. Rankings are scoped to the browser and origin. Clearing site data removes them.

### Deployment and usability risks

| Risk | Required response or verification |
| --- | --- |
| Model or WASM asset fails to load | Keep timed play gated and offer retry. Smoke-test the deployed page and model URL while signed out. |
| Slow or inaccurate recognition | Warm the model before play. Measure release-to-result latency and per-class correct, incorrect, and rejected strokes on real mouse and touch inputs. Investigate a Web Worker if inference blocks interaction. |
| WebGL or audio unavailable | Preserve duel controls and readable status. Use the illustrated scene where WebGL is unavailable and support muted play. |
| Timer pressure or unclear feedback | Test multi-rune defense on small screens and with reduced motion. Verify the current counter, damage outcome, and next input window are distinguishable. |
| Browser storage blocked | Keep the run summary visible and report a save failure without interrupting play. |

## 7. Release scope

**Required** includes tutorial, single-stroke CNN inference, playable duels, score-based enemy health, combat audio, difficulty progression, feedback, pause/resume, restart, and local rankings.

**Deferred** includes player movement, fusion spells, polished multi-frame animation, and online rankings. Any future competitive ranking needs trusted server-side submission and validation.

## 8. Acceptance criteria

| Area | Pass condition |
| --- | --- |
| Start and tutorial | Players can learn or skip rune paths and counters. Model load and warmup finish before timed play. Failures show a retry control. |
| Drawing | A real single stroke produces a CNN classification in the correct slot. Taps, canceled strokes, and strokes incomplete at the deadline leave the slot empty. A late result from an old turn cannot affect the next one. |
| Combat | All five counter mappings, mixed correct and incorrect slots, player and enemy damage values, weakness damage, and HP clamping match the current rules. Damage and score apply once even with repeated clicks or restart during transitions. |
| Timing | Incoming preview flights occur in order and finish before defense opens. A released stroke casts automatically. One counter resolves before the next input window. Deadline behavior, hidden-tab pause, and explicit resume preserve turn boundaries. |
| Progression | Test every inclusive level threshold, the structured grammars, weakness weighting, player healing to 100 HP, enemy health rising from 3 to 20 HP by 4,500 points, and the cap of ten perfect-defense bonuses. |
| Audio | Each elemental cast has a distinct cue. Damage and successful blocks have separate cues. Repeated renders and pause/resume do not replay cues for the same turn. Gameplay is usable without audio. |
| Results | Defeat and quit-and-save each persist one run record. Refresh preserves the local leaderboard and its specified tie order. |
| Browser and model | Verify mouse and touch input, small-screen layout, ONNX/PyTorch output parity, human-drawn recognition by class, and measured capture-to-prediction latency. Record observed rejection and error rates before setting a release threshold. |
| Ordered counters | Inject a Fire then Water sequence. Water and Lightning in order must block both. A wrong first rune must apply Fire damage before the Water input window opens. |
| Focused | Guard two consecutive spells to reach white, then progress through all tiers up to blue at seven. At six or seven, verify a correct enemy ward shatters and the attack deals damage. Taking damage must reset the streak. |
| Recovery | Try an unclear stroke, a timed-out stroke, a hidden-tab pause, and a model load failure. Confirm retry or resume behavior and verify that no stale or duplicate cast changes HP. |
| Instructor access | Open the public site and GitHub repository while signed out. Confirm the home page, tutorial, drawing surface, visible cast or retry feedback, and both Markdown documents are reachable. |

## References

- [Model specification](MODEL_SPEC.md)
- [Combat rules](lib/spellcaster-rules.json)
