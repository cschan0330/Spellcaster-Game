# Spellcaster model specification

The model performs five-class image classification on one elemental rune drawn on the duel canvas. An accepted prediction casts the corresponding attack or counter immediately. Enemy behavior is rule-driven.

## Dataset and training

The working dataset contains 25,000 labeled 28 × 28 grayscale images. Fire uses 5,000 flame outlines from distinct Quick, Draw! campfire sketches. Earth and Lightning use Quick, Draw! triangle and lightning bitmaps. Water and Wind are procedurally drawn droplet and S-curve shapes. Quick, Draw! drawings are attributed to Google, Inc. and contributors under CC BY 4.0. [Dataset source and license](https://github.com/googlecreativelab/quickdraw-dataset#license)

Each class contributes 4,000 training, 500 validation, and 500 test examples. Add 480 perturbed HUD traces to training for each non-Fire class, giving 21,920 training, 2,500 validation, and 2,500 test images. Keep augmentation out of validation and test. Source IDs distinguish Fire drawings. The Earth and Lightning bitmap format does not identify individual writers.

The PyTorch CNN has three blocks with 24, 48, and 64 channels. Each block uses two 3 × 3 convolutions with batch normalization and ReLU followed by max pooling. Average pooling feeds a 96-unit dense layer with dropout and a five-logit output. Local stroke patterns and modest spatial shifts are suitable for this architecture.

Train using cross-entropy and AdamW with a OneCycle schedule peaking at 0.002. Compare batch sizes 128 and 256 for up to 24 epochs, with early stopping after six epochs without improvement. Select by validation accuracy with validation loss as the tie-breaker. Evaluate the selected checkpoint with test accuracy, macro F1, per-class recall, and a confusion matrix. The recorded run selected batch 128 at epoch 13 with 99.52% validation accuracy. The held-out set yielded 99.24% accuracy and 0.9924 macro F1, including 500 of 500 Fire samples.

## Interface and deployment

- The browser accepts one mouse, touch, or stylus stroke. Canvas rasterization creates a centered, bright stroke on black and scales it to a 28 × 28 input. Near-empty strokes are rejected before inference.
- The ONNX input is `drawing`, a float32 tensor shaped `[1, 1, 28, 28]` with values from 0 to 1. The output is `logits`, a float32 tensor shaped `[1, 5]`, in order Fire, Water, Earth, Wind, Lightning.
- ONNX Runtime Web uses the WASM execution provider. The browser loads and warms the model before enabling a timed duel. The app uses the top softmax score and a provisional 0.60 cutoff. Browser rendering and the cutoff require calibration with real player input.
- The held-out test evaluates dataset rasters. A separate browser-runtime check accepted 505 out of 505 controlled icon traces at the gameplay cutoff. The trace check uses variations of the same HUD glyph shapes supplied during non-Fire training. Accuracy on live player drawings remains unmeasured.

Vercel serves the [ONNX artifact](public/model/runes.onnx) with the Next.js app. The [browser recognizer](lib/spellcaster-recognizer.js) loads the artifact and invokes inference on-device. Test ONNX/PyTorch prediction agreement, cold model load, warmed inference latency, and acceptance and error rates on independently collected mouse and touch traces before treating the cutoff as calibrated.
