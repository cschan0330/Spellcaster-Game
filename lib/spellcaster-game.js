import rules from "./spellcaster-rules.json" with { type: "json" };

export { rules };
export const elements = rules.classOrder;
const pick = (items, random) => items[Math.floor(random() * items.length)];
export const levelAt = (score) => rules.levels.findLast((level) => score >= level.minScore);
export const focusAt = (streak) => rules.focusTiers.findLast((tier) => streak >= tier.guards);
export const randomElement = (random = Math.random) => pick(elements, random);

export function enemySequence(level, player, random = Math.random) {
  switch (level.grammar) {
    case "single_basic": return [pick(elements.slice(0, 3), random)];
    case "single_all": return [randomElement(random)];
    case "any": {
      const pool = [...elements, ...Array(level.weaknessRuneWeight - 1).fill(rules.counterOf[player])];
      return Array.from({ length: level.comboLength }, () => pick(pool, random));
    }
    default: {
      const patterns = level.grammar.split("_or_");
      const a = randomElement(random);
      const b = pick(elements.filter((element) => element !== a), random);
      return Array.from(pick(patterns, random), (slot) => slot === "A" ? a : b);
    }
  }
}

export function enemyCounters(sequence, level, random = Math.random) {
  return sequence.map((rune) => {
    const correct = rules.counterOf[rune];
    return random() >= level.defenseError
      ? correct
      : pick(elements.filter((element) => element !== correct), random);
  });
}

export function resolveHits(attack, defense, target, baseDamage = rules.baseDamage) {
  return attack.map((rune, index) => {
    if (defense[index] === rules.counterOf[rune]) return 0;
    return baseDamage * (rune === rules.counterOf[target] ? rules.weaknessMultiplier : 1);
  });
}

export function victoryPoints(level, hp, perfect) {
  const { pointsPerLevel, pointsPerRemainingHP, pointsPerPerfectTurn, perfectTurnBonusCap } = rules.victoryScore;
  return level * pointsPerLevel + hp * pointsPerRemainingHP
    + Math.min(perfect, perfectTurnBonusCap) * pointsPerPerfectTurn;
}

export function damageCue(game) {
  if (!game) return null;
  const playerHit = game.phase === "defenseResult" || (game.phase === "over" && game.playerHP === 0);
  const enemyHit = game.phase === "attackResult" || game.phase === "won";
  if (!playerHit && !enemyHit) return null;
  const rune = playerHit ? game.incoming[game.slot] : game.spell;
  const elements = rune && game.hits[0] > 0 ? [rune] : [];
  return elements.length ? {
    id: `${game.id}:${game.turn}`, target: playerHit ? "player" : "enemy", elements,
  } : null;
}

export const inputPhases = ["defend", "attack"];
export const enemyCastDuration = .61;
const enemyCastInterval = enemyCastDuration + .05;
export const enemyCastDelay = (index) => .28 + index * enemyCastInterval;
const previewMs = (sequence) => Math.round((rules.previewSeconds + (sequence.length - 1) * enemyCastInterval) * 1000);
export const playerCastDuration = .48;
const windowMs = (game) => game.level.secondsPerRune * 1000;
const phase = (game, name, now, duration = 0, extra = {}) => ({
  ...game, phase: name, turn: game.turn + 1, deadline: now + duration,
  remaining: duration, paused: false, pending: false, shieldBroken: false, feedback: "", ...extra,
});

export function openDuel(run, now, enemy, sequence) {
  const level = levelAt(run.score);
  const { startingHP, maximumHP, scoreAtMaximum } = rules.enemyHealth;
  const progress = Math.min(1, Math.max(0, run.score / scoreAtMaximum));
  const enemyMaxHP = startingHP + Math.floor((maximumHP - startingHP) * progress);
  return phase(run, "preview", now, previewMs(sequence), {
    level, enemy, duel: run.wins + 1, incoming: sequence, slot: 0,
    playerHP: rules.startingHP, enemyHP: enemyMaxHP, enemyMaxHP,
    highest: Math.max(run.highest, level.level), perfect: 0, hits: [],
    guardStreak: run.guardStreak ?? 0,
  });
}

function resolveDefense(game, now) {
  const [damage] = resolveHits([game.incoming[game.slot]], [game.spell], game.player);
  const playerHP = Math.max(0, game.playerHP - damage);
  const guardStreak = damage ? 0 : Math.min((game.guardStreak ?? 0) + 1, rules.focusTiers.at(-1).guards);
  const perfectDefense = !damage && game.perfectDefense;
  const perfect = game.perfect + Number(perfectDefense && game.slot === game.incoming.length - 1);
  return phase(game, playerHP ? "defenseResult" : "over", now, 650, {
    hits: [damage], playerHP, guardStreak, perfectDefense, perfect,
    feedback: damage ? `You took ${damage} damage.` : "Spell blocked.",
  });
}

function startFlight(game, now, { rune, drawing }, random) {
  const defending = game.phase === "defend";
  const [counter] = defending ? [] : enemyCounters([rune], game.level, random);
  return phase(game, defending ? "defenseFlight" : "enemyDefense", now, playerCastDuration * 1000, {
    spell: rune, drawing, counter, hits: [], paused: game.paused,
  });
}

function startInput(game, name, now, slot) {
  return phase(game, name, now, windowMs(game), { slot, spell: null, drawing: null, hits: [] });
}

export function advance(game, event) {
  const { now, random = Math.random } = event;
  if (event.turn !== game.turn || event.id !== game.id) return game;
  if (event.type === "pause" && !game.paused && !["won", "over"].includes(game.phase)) {
    return { ...game, paused: true, remaining: Math.max(0, game.deadline - now) };
  }
  if (event.type === "resume" && game.paused) {
    return { ...game, paused: false, deadline: now + game.remaining };
  }
  const acceptsInput = inputPhases.includes(game.phase) && !game.paused && now < game.deadline;
  if (event.type === "release" && acceptsInput && !game.pending) {
    return { ...game, pending: true, feedback: "" };
  }
  if (event.type === "prediction" && game.pending) {
    if (event.rune) return startFlight(game, now, event, random);
    return { ...game, pending: false, feedback: event.message || "" };
  }
  if (event.type !== "tick" || game.paused || now < game.deadline || game.pending) return game;
  switch (game.phase) {
    case "preview": return startInput({ ...game, perfectDefense: true }, "defend", now, 0);
    case "defend":
    case "defenseFlight": return resolveDefense(game, now);
    case "defenseResult": return game.slot + 1 < game.incoming.length
      ? startInput(game, "defend", now, game.slot + 1)
      : startInput(game, "attack", now, 0);
    case "attack": return phase(game, "attackResult", now, 300, { feedback: "No spell cast." });
    case "enemyDefense": {
      const focus = focusAt(game.guardStreak);
      const shieldBroken = Boolean(focus?.breaksShield && game.counter === rules.counterOf[game.spell]);
      const defense = shieldBroken ? [] : [game.counter];
      const hits = resolveHits([game.spell], defense, game.enemy, focus?.damage ?? rules.playerSpellDamage);
      const [damage] = hits;
      const enemyHP = Math.max(0, game.enemyHP - damage);
      if (enemyHP) {
        return phase(game, "attackResult", now, 650, {
          hits, enemyHP, shieldBroken,
          feedback: damage ? `${shieldBroken ? "Shield shattered. " : ""}Opponent took ${damage} damage.` : "Opponent blocked the spell.",
        });
      }
      const points = victoryPoints(game.level.level, game.playerHP, game.perfect);
      return phase(game, "won", now, 0, {
        hits, enemyHP, shieldBroken, points, score: game.score + points, wins: game.wins + 1,
      });
    }
    case "attackResult": {
      if (game.slot + 1 < game.level.comboLength) return startInput(game, "attack", now, game.slot + 1);
      const incoming = enemySequence(game.level, game.player, random);
      return phase(game, "preview", now, previewMs(incoming), {
        incoming, slot: 0, spell: null, drawing: null, hits: [],
      });
    }
    default: return game;
  }
}
