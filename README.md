# MNIST Digit Lab

A Next.js application for handwritten digit recognition. Draw a number on the homepage to see the trained CNN's prediction, confidence, and probabilities for digits 0-9. Inference runs locally in the browser using weights trained by `mnist_train.py`.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000/`. For production, run `npm run build`, then `npm run start`.

Vercel uses `vercel.json`. Set Root Directory to the repository root. The only application page is `/`; `/mnist/` redirects there. Model assets are served under `/mnist/`.

`components/DigitLab.jsx` renders the interface. `mnist/app.js` handles drawing and preprocessing; `mnist/network.js` implements CNN inference. The build copies model assets with `scripts/prepare-assets.mjs`.

The model achieved **98.54% accuracy on all 10,000 MNIST test images**. Browser predictions matched PyTorch on 100 reference images. Hand-drawn digits can differ from MNIST; confidence does not guarantee correctness.

After building, run `node mnist/browser-check.mjs` to verify homepage identity, removed legacy assets, drawing, inference, and clearing at mobile, tablet, and desktop widths. This Windows check requires Microsoft Edge and creates its own local production server. See [model documentation](mnist/README.md) for training and export instructions.
