# Spellcaster

Spellcaster is a first-person wizard duel game where a trained CNN turns single-stroke drawings into Fire, Water, Earth, Wind, or Lightning spells. Draw the matching counter for each incoming spell, then cast attacks during your opening. Consecutive successful guards build Focused, increasing spell damage and brightening your wand. Ended runs are saved to a leaderboard on the current device.

## Run locally

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the local URL printed by Next.js. Choose **How to play** to see the rune shapes and counter rules. Use the mouse to look, then press and hold to draw with the crosshair. On touch, draw with one finger. Release to cast.

- **F** toggles fullscreen or expanded view.
- **R** recenters the view.
- **Esc** pauses and releases the mouse. Use the pause menu to adjust mouse sensitivity.

## How it works

- [Recognizer](lib/spellcaster-recognizer.js) converts a stroke to a 28 × 28 grayscale image. ONNX Runtime Web runs the [trained model](public/model/runes.onnx) in the browser and returns a rune and confidence score.
- [Combat logic](lib/spellcaster-game.js) applies the prediction to the current attack or defense and handles damage, scoring, and progression.
- [Duel scene](components/DuelScene.jsx) renders the low-poly arena, animated wizards, wand, and elemental effects with Three.js. An illustrated arena is available when WebGL is unavailable.

See the [product requirements](PRD.md) and [model specification](MODEL_SPEC.md) for the game rules, dataset, and training results. Quick, Draw! samples are credited to Google, Inc. and contributors under CC BY 4.0.
