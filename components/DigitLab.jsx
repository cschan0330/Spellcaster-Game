import Head from 'next/head';
import Script from 'next/script';

export default function DigitLab() {
  return <>
    <Head>
      <title>Digit Lab — MNIST recognition</title>
      <meta name="description" content="Draw a digit and recognize it with a trained MNIST CNN, entirely in your browser." />
      <meta name="theme-color" content="#101311" />
      <link rel="stylesheet" href="/mnist/style.css" />
    </Head>
    <header><a className="brand" href="/"><span className="brand-icon">∿</span> DIGIT LAB</a><span className="tag">AN INTERACTIVE ML EXPERIMENT</span><span id="status" role="status"><i /> Loading model</span></header>
    <main>
      <section className="intro"><p className="eyebrow">HANDWRITING → NEURAL NETWORK → PREDICTION</p><h1>A little scribble.<br /><span>A lot of neurons.</span></h1><p className="description">Draw a number. See what the machine sees.<br />A real MNIST model, running right here in your browser.</p></section>
      <section className="workspace" aria-label="Digit recognition workspace">
        <article className="draw-panel">
          <div className="panel-heading"><h2><span>01</span> Your canvas</h2><span className="small-label">DIGITS 0–9</span></div>
          <div className="canvas-wrap">
            <canvas id="drawing" width="560" height="560" aria-label="Draw a digit with your mouse, finger, or stylus" />
            <div id="placeholder" aria-hidden="true"><span>✎</span>Make your mark<small>Draw one digit in the center</small></div>
            {['tl','tr','bl','br'].map(c=><span key={c} className={`corner ${c}`} />)}
          </div>
          <div className="tools"><label>Brush <input id="brush" aria-label="Brush size" type="range" min="12" max="38" defaultValue="24" /></label><button id="clear" className="secondary">↺ Clear</button></div>
          <button id="recognize" className="primary" disabled>Recognize digit <span>↗</span></button>
          <p className="hint">Mouse, touch, or stylus. Keep your digit large and centered.</p>
        </article>
        <article className="result-panel">
          <div className="panel-heading"><h2><span>02</span> The prediction</h2><span className="live"><i /> LIVE INFERENCE</span></div>
          <div className="prediction"><div><p className="small-label">I THINK THIS IS A</p><div id="digit" aria-live="polite">—</div></div><div className="confidence"><span id="confidence">—</span><p>model confidence</p><span id="time">Waiting for your first digit</span></div></div>
          <div className="prob-heading"><h3>Class probabilities</h3><span>0 → 100%</span></div><div id="probabilities" />
          <div className="model-input"><canvas id="processed" width="28" height="28" aria-label="28 by 28 pixel model input" /><div><strong>Through the model’s eyes</strong><p>Cropped, centered, and resized to 28 × 28 pixels.</p></div><span className="input-tag">INPUT</span></div>
          <p id="message" role="status">Ready when you are. Draw a digit to get started.</p>
        </article>
      </section>
      <section className="details">
        <div><span className="detail-icon">⌘</span><h3>Your Python. In the browser.</h3><p>The CNN architecture and trained weights come from <code>mnist_train.py</code>.</p></div>
        <div><span className="detail-icon">▦</span><h3>Small pixels, big dataset.</h3><p>Trained on 55,000 MNIST images, with 5,000 reserved for validation.</p></div>
        <div><span className="detail-icon">↗</span><h3>Local by design.</h3><p>Your drawings stay on your device. No uploads, accounts, or server inference.</p></div>
      </section>
      <footer><span>DIGIT LAB <span className="muted">/ MNIST EXPLORER</span></span><span id="accuracy">Model loading…</span></footer>
    </main>
    <Script src="/mnist/app.js" type="module" strategy="afterInteractive" />
  </>;
}
