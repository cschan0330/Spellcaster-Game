# Spellcaster model specification

The model performs five-class image classification on one elemental rune drawn on the duel canvas. An accepted prediction casts the corresponding attack or counter immediately. Enemy behavior is rule-driven.

## Dataset and training

The working dataset contains 25,000 labeled 28 × 28 grayscale images. Fire uses 5,000 flame outlines from distinct Quick, Draw! campfire sketches. Earth and Lightning use Quick, Draw! triangle and lightning bitmaps. Water and Wind are procedurally drawn droplet and S-curve shapes. Quick, Draw! drawings are attributed to Google, Inc. and contributors under CC BY 4.0. [Dataset source and license](https://github.com/googlecreativelab/quickdraw-dataset#license)

Each class contributes 4,000 training, 500 validation, and 500 test examples. Add 480 perturbed HUD traces to training for each non-Fire class, giving 21,920 training, 2,500 validation, and 2,500 test images. Keep augmentation out of validation and test. Source IDs distinguish Fire drawings. The Earth and Lightning bitmap format does not identify individual writers.

| ID | Rune | Source and representative shape | Train after augmentation | Validation | Test |
| ---: | --- | --- | ---: | ---: | ---: |
| 0 | Fire | Quick, Draw! campfire, isolated pointed flame | 4,000 | 500 | 500 |
| 1 | Water | Procedural closed droplet | 4,480 | 500 | 500 |
| 2 | Earth | Quick, Draw! triangle bitmap | 4,480 | 500 | 500 |
| 3 | Wind | Procedural open S-curve | 4,480 | 500 | 500 |
| 4 | Lightning | Quick, Draw! lightning bitmap | 4,480 | 500 | 500 |
| | Total | | 21,920 | 2,500 | 2,500 |

The Fire extractor selects one flame-like stroke per source drawing, leaves separate logs and marks out, and removes duplicate rasters. The base archive preserves provenance for the sampled bitmap rows. HUD augmentation perturbs the non-Fire guide shapes with point jitter, axis scaling, and rotation. The sources and rasters are available locally for training. Key risks are writer overlap in bitmap data, template bias in procedural classes, and different stroke styles on mouse and touch. The proposal includes two actual test rasters per class. [Quick, Draw! download formats](https://github.com/googlecreativelab/quickdraw-dataset#get-the-data)

The PyTorch CNN has three blocks with 24, 48, and 64 channels. Each block uses two 3 × 3 convolutions with batch normalization and ReLU followed by max pooling. Average pooling feeds a 96-unit dense layer with dropout and a five-logit output. Local stroke patterns and modest spatial shifts are suitable for this architecture.

Train using cross-entropy and AdamW with a OneCycle schedule peaking at 0.002. Compare batch sizes 128 and 256 for up to 24 epochs, with early stopping after six epochs without improvement. Select by validation accuracy with validation loss as the tie-breaker. Evaluate the selected checkpoint with test accuracy, macro F1, per-class recall, and a confusion matrix. The recorded run selected batch 128 at epoch 13 with 99.52% validation accuracy. The held-out set yielded 99.24% accuracy and 0.9924 macro F1, including 500 of 500 Fire samples.

### Architecture and run configuration

| Stage | Configuration | Output per sample |
| --- | --- | --- |
| Block 1 | Two 3 × 3 convolutions, 24 channels, batch normalization and ReLU after each, then 2 × 2 max pool | 24 × 14 × 14 |
| Block 2 | Same block structure, 48 channels | 48 × 7 × 7 |
| Block 3 | Same block structure, 64 channels | 64 × 3 × 3 |
| Head | 2 × 2 average pool with stride 1, flatten, dense 256 → 96, ReLU, dropout 0.20, dense 96 → 5 | 5 logits |

Convolutions use padding 1 and no bias. The network contains **126,717 trainable parameters**. The recorded run used seed 20261123, AdamW weight decay 0.01, and a OneCycle warmup fraction of 0.15. Batch 256 reached 99.20% validation accuracy at epoch 5. The selected weights were evaluated on the held-out split after model selection.

| Actual rune | Correct / test examples | Recall | Other predictions |
| --- | ---: | ---: | --- |
| Fire | 500 / 500 | 100.0% | None |
| Water | 500 / 500 | 100.0% | None |
| Earth | 487 / 500 | 97.4% | 13 Lightning |
| Wind | 500 / 500 | 100.0% | None |
| Lightning | 494 / 500 | 98.8% | 6 Earth |

The Earth–Lightning confusion accounts for all 19 test errors. These are recorded notebook results, with no fresh training run implied.

## Interface and deployment

- The browser accepts one mouse, touch, or stylus stroke. Canvas rasterization creates a centered, bright stroke on black and scales it to a 28 × 28 input. Near-empty strokes are rejected before inference.
- The ONNX input is `drawing`, a float32 tensor shaped `[1, 1, 28, 28]` with values from 0 to 1. The output is `logits`, a float32 tensor shaped `[1, 5]`, in order Fire, Water, Earth, Wind, Lightning.
- ONNX Runtime Web uses the WASM execution provider. The browser loads and warms the model before enabling a timed duel. The app uses the top softmax score and a provisional 0.60 cutoff. Browser rendering and the cutoff require calibration with real player input.
- The held-out test evaluates dataset rasters. A separate browser-runtime check accepted 505 out of 505 controlled icon traces at the gameplay cutoff. The trace check uses variations of the same HUD glyph shapes supplied during non-Fire training. Accuracy on live player drawings remains unmeasured.

Vercel serves the [ONNX artifact](public/model/runes.onnx) with the Next.js app. The [browser recognizer](lib/spellcaster-recognizer.js) loads the artifact and invokes inference on-device. Test ONNX/PyTorch prediction agreement, cold model load, warmed inference latency, and acceptance and error rates on independently collected mouse and touch traces before treating the cutoff as calibrated.

### Integration contract and verification

1. One pointer gesture supplies screen-relative coordinates. Reject fewer than two points or a span below 18 pixels. Center the trace on a 112 × 112 canvas, scale its longer side to 76 pixels, and draw a round 8-pixel stroke.
2. Average alpha over 4 × 4 blocks to produce 784 values in row-major order. Submit the resulting NCHW tensor to the warmed WASM session. The export uses ONNX opset 17, weighs 508,896 bytes, and runs with one WASM thread.
3. Pick the maximum logit and compute its softmax score. At a score of at least 0.60, pass the rune to the combat state machine. A low score or inference failure gives retry feedback while the input window remains open. An outdated result cannot cast into a later turn.
4. Treat a failed session load as a start-screen error with retry. Verify that the public site can retrieve the ONNX file and the runtime assets. No inference server or GPU is needed for the browser.

| Verification | Evidence or next check |
| --- | --- |
| Model artifact | Confirm the input and output names, shapes, and class order. Compare PyTorch and ONNX predictions on a fixed held-out fixture before replacing the artifact. |
| Browser compatibility | The controlled trace run exercised the browser runtime. Check startup, warmed latency, and successful casts on desktop mouse and mobile touch separately. |
| Gameplay reliability | Collect independent player traces for each rune and unrelated or partial strokes. Report correct accepted predictions, wrong accepted predictions, rejection rates, and latency per input type. Tune the threshold on a separate calibration split. |
| Public delivery | The [deployed site](https://spellcastergame.vercel.app/) served an ONNX artifact whose SHA-256 matched the repository artifact during the deployment check. |
