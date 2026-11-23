# Spellcaster

**[Play Spellcaster on Vercel](https://spellcastergame.vercel.app/)**

Spellcaster is a first-person wizard duel game powered by a custom-trained rune classifier. Draw one stroke to cast Fire, Water, Earth, Wind, or Lightning. The prediction determines which attack or counter the game resolves.

## AI model

The rune recognizer is a **126,717-parameter PyTorch CNN** trained for five-class image classification. Its convolution layers learn local stroke features such as corners and curves, while pooling reduces the spatial resolution before classification.

| Stage | Configuration |
| --- | --- |
| Input | `drawing`, float32 `[1, 1, 28, 28]`, scaled to `[0, 1]` |
| Convolution blocks | 24, 48, and 64 output channels. Each block has two 3 × 3 convolutions with padding 1, batch normalization, and ReLU, followed by 2 × 2 max pooling. |
| Classification head | 2 × 2 average pooling with stride 1, flatten to 256 features, dense layer with 96 units, ReLU, dropout 0.20, then a 5-unit linear layer |
| Output | `logits`, float32 `[1, 5]`, in Fire, Water, Earth, Wind, Lightning order |
| Browser runtime | [ONNX model](public/model/runes.onnx), opset 17, 508,896 bytes. ONNX Runtime Web uses single-threaded WASM. |

### Dataset and training

The base dataset contains 25,000 balanced grayscale rune images. Fire comes from flame outlines extracted from distinct Quick, Draw! campfire sketches. Earth and Lightning use Quick, Draw! triangle and lightning bitmaps. Water and Wind use procedurally generated droplet and S-curve rasters. Quick, Draw! samples are credited to Google, Inc. and contributors under CC BY 4.0.

| Setting | Value |
| --- | --- |
| Splits | 20,000 base training, 2,500 validation, 2,500 test. Training adds 1,920 perturbed HUD traces for a total of 21,920. |
| Loss and optimizer | Cross-entropy, AdamW, weight decay 0.01 |
| Learning-rate schedule | OneCycle, peak learning rate 0.002, warmup fraction 0.15 |
| Training budget | Batch sizes 128 and 256 compared, up to 24 epochs, early-stopping patience 6, seed 20261123 |
| Selected checkpoint | Batch size 128, epoch 13, 99.52% validation accuracy |
| Held-out results | 99.24% accuracy (2,481/2,500), macro F1 0.9924, Fire recall 500/500 |

Checkpoint selection used validation accuracy with validation loss as the tie-breaker. The test results measure held-out dataset rasters. Recognition accuracy on independent live-player drawings remains unmeasured.

### Inference in the game

The [browser recognizer](lib/spellcaster-recognizer.js) centers the stroke on a 112 × 112 canvas, fits its longest dimension to 76 pixels, and draws it with an 8-pixel round line. It averages each 4 × 4 block to produce the 28 × 28 model input. The browser warms the model before enabling timed play. Predictions with a top softmax score of at least 0.60 trigger a cast. Lower scores prompt the player to retry.

The [combat logic](lib/spellcaster-game.js) resolves the predicted rune against the active spell, and the [Three.js duel scene](components/DuelScene.jsx) renders the hit, block, and wand effects. See the [model specification](MODEL_SPEC.md) for more on the AI pipeline and the [PRD](PRD.md) for game rules and acceptance criteria.

## Run locally

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the local URL printed by Next.js. Choose **How to play** to see the rune shapes and counter rules. Use the mouse to look, then press and hold to draw with the crosshair. On touch, draw with one finger. Release to cast.

- **F** toggles fullscreen or expanded view.
- **R** recenters the view.
- **Esc** pauses and releases the mouse. Use the pause menu to adjust mouse sensitivity.
