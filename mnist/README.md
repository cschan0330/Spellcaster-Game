# Digit Lab

Draw a digit with a mouse, touch screen, or stylus. Predictions update after each stroke; the Recognize button runs them again. Clear resets the canvas and prediction.

From the repository root, run `npm run dev` and open the printed URL followed by `/mnist/`. `npm run build` includes the page and model under `dist/mnist/`. You can also serve the repository with `python -m http.server 8000` and visit `http://localhost:8000/mnist/`.

The original `../mnist_train.py` is unchanged. Its CNN was trained for five epochs using its original seed, split, optimizer, and learning rate. The checkpoint selected by validation accuracy reached **98.56% validation accuracy** and **98.54% test accuracy** on all 10,000 MNIST test images. Drawings outside the MNIST distribution can be misclassified, and softmax confidence is not a guarantee of correctness.

To retrain and export, run from this directory:

```powershell
python ../mnist_train.py
python export_model.py
node verify.mjs
```

Python requires PyTorch, torchvision, and NumPy. Training downloads MNIST into the ignored `data/` directory. `mnist.pt` is the selected PyTorch checkpoint; `weights.bin` contains the same tensors in little-endian float32 format, described by `model.json`. Browser inference uses plain JavaScript with the same convolution, ReLU, max pooling, and linear layers. It needs no Python server or external ML service. The verification compares 100 real MNIST test images against PyTorch logits.

Canvas preprocessing crops the ink, fits it into a 20 × 20 region, and centers its mass in a black 28 × 28 image with white strokes. The page shows that exact model input. Google Fonts are optional; system fonts work offline.
