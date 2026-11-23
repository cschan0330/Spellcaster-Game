import { enemyCastDelay, focusAt } from "./spellcaster-game.js";

const TAU = 2 * Math.PI;
const wave = (cycles) => Math.sin(TAU * cycles);

const effects = {
  focus: [.36, (t, noise) =>
    .46 * wave(145 * t - 120 * t * t) * Math.exp(-13 * t) +
    .24 * wave(620 * t + 650 * t * t) * Math.exp(-9 * t) +
    .18 * noise * Math.exp(-75 * t)],
  shatter: [.38, (t, noise, low) =>
    .58 * (noise - low) * Math.exp(-13 * t) * (.7 + .3 * wave(42 * t)) +
    .25 * wave(1060 * t - 1300 * t * t) * Math.exp(-16 * t)],
  damage: [.27, (t, noise) =>
    .53 * wave(108 * t - 132 * t * t) * Math.exp(-15 * t) +
    .38 * noise * Math.exp(-55 * t)],
  lightning: [.36, (t, noise, low) =>
    .66 * (noise - low) * Math.exp(-15 * t) * (.55 + .45 * wave(86 * t)) +
    .24 * wave(680 * t - 850 * t * t) * Math.exp(-22 * t)],
  fire: [.54, (t, noise, low) =>
    (.95 * low + .12 * noise * wave(53 * t)) * Math.exp(-5 * t) * Math.min(1, t * 25)],
  water: [.45, (t, noise) =>
    .18 * noise * Math.exp(-12 * t) + [0, .055, .116].reduce((sum, start, index) => {
      const u = t - start;
      return u < 0 ? sum : sum + .24 * wave((340 + index * 165) * u + 1600 * u * u) *
        Math.min(1, u * 250) * Math.exp(-22 * u);
    }, 0)],
  earth: [.49, (t, noise, low) =>
    .48 * wave(77 * t - 46 * t * t) * Math.exp(-8 * t) +
    (.46 * low + .1 * noise) * Math.exp(-7 * t) * (.6 + .4 * wave(24 * t))],
  wind: [.60, (t, noise, low) =>
    (.29 * (noise - low) + .46 * low + .12 * wave(226 * t + 260 * t * t)) *
    Math.sin(Math.PI * t / .60) ** 2],
  blocking: [.42, (t, noise) =>
    .2 * noise * Math.exp(-120 * t) + .35 * wave(750 * t) * Math.exp(-8 * t) +
    .23 * wave(1140 * t) * Math.exp(-13 * t)],
};

function makeBuffer(context, [duration, sample]) {
  const buffer = context.createBuffer(1, Math.ceil(duration * context.sampleRate), context.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 14191;
  let low = 0;
  for (let index = 0; index < data.length; index++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    low += .055 * (noise - low);
    const time = index / context.sampleRate;
    const fade = Math.min(1, time * 350, (duration - time) * 55);
    data[index] = sample(time, noise, low) * fade;
  }
  return buffer;
}

export function createDuelAudio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return null;
  const context = new Audio();
  const output = context.createGain();
  output.gain.value = .36;
  output.connect(context.destination);
  const buffers = new Map();

  return {
    resume() {
      if (context.state !== "running") context.resume().catch(() => {});
    },
    close() {
      context.close().catch(() => {});
    },
    play(name, delay = 0) {
      if (!effects[name]) return;
      if (!buffers.has(name)) buffers.set(name, makeBuffer(context, effects[name]));
      const sound = context.createBufferSource();
      sound.buffer = buffers.get(name);
      sound.connect(output);
      sound.onended = () => sound.disconnect();
      sound.start(context.currentTime + delay);
    },
  };
}

export function playDuelTransition(audio, previous, next) {
  if (!audio || !next || next.paused) return;
  if (previous?.id === next.id && previous.turn === next.turn) return;
  if (next.phase === "preview") {
    next.incoming.forEach((element, index) => audio.play(element, enemyCastDelay(index)));
  } else if (["enemyDefense", "defenseFlight"].includes(next.phase)) {
    audio.play(next.spell);
  } else if (["defenseResult", "attackResult", "won"].includes(next.phase) ||
      (next.phase === "over" && next.playerHP === 0)) {
    const shatters = next.shieldBroken && ["attackResult", "won"].includes(next.phase);
    if (shatters) audio.play("shatter");
    if (next.hits.some(hit => hit > 0)) audio.play("damage", shatters ? .06 : 0);
    if (next.hits.includes(0)) audio.play("blocking");
    const focus = focusAt(next.guardStreak);
    if (next.phase === "defenseResult" && focus && focus !== focusAt(previous?.guardStreak)) {
      audio.play("focus", .08);
    }
  }
}
