import { elements } from "./spellcaster-game";

export const modelVersion = "runes-v2-campfire-canvas76";

export async function loadRecognizer() {
  const ort = await import("onnxruntime-web/wasm");
  ort.env.wasm.numThreads = 1;
  const session = await ort.InferenceSession.create(`/model/runes.onnx?v=${modelVersion}`, {
    executionProviders: ["wasm"],
  });
  async function predict(pixels) {
    const drawing = new ort.Tensor("float32", pixels, [1, 1, 28, 28]);
    const { logits } = await session.run({ drawing });
    const peak = Math.max(...logits.data);
    const index = logits.data.indexOf(peak);
    const score = 1 / logits.data.reduce((sum, logit) => sum + Math.exp(logit - peak), 0);
    return { rune: elements[index], score };
  }
  await predict(new Float32Array(784));
  return predict;
}

export function rasterize(points) {
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const width = Math.max(...xs) - minX, height = Math.max(...ys) - minY;
  if (points.length < 2 || Math.max(width, height) < 18) return null;

  const image = document.createElement("canvas");
  image.width = image.height = 112;
  const draw = image.getContext("2d", { willReadFrequently: true });
  // Match the roughly 76-pixel span of the procedural training strokes.
  const scale = 76 / Math.max(width, height);
  draw.strokeStyle = "white";
  draw.lineWidth = 8;
  draw.lineCap = draw.lineJoin = "round";
  draw.beginPath();
  points.forEach(({ x, y }, index) => {
    const method = index ? "lineTo" : "moveTo";
    draw[method]((x - minX - width / 2) * scale + 56, (y - minY - height / 2) * scale + 56);
  });
  draw.stroke();

  const pixels = new Float32Array(784);
  const { data } = draw.getImageData(0, 0, 112, 112);
  for (let y = 0; y < 112; y++) {
    for (let x = 0; x < 112; x++) {
      pixels[(y >> 2) * 28 + (x >> 2)] += data[(y * 112 + x) * 4 + 3] / (16 * 255);
    }
  }
  return { pixels, drawing: image.toDataURL() };
}
