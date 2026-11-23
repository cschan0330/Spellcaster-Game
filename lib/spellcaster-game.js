import rules from "./spellcaster-rules.json" with { type: "json" };

export { rules };
export const elements = rules.classOrder;
const pick = (items, random) => items[Math.floor(random() * items.length)];
export const levelAt = (score) => rules.levels.findLast((level) => score >= level.minScore);
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

export function resolveHits(attack, defense, target) {
  return attack.map((rune, index) => {
    if (defense[index] === rules.counterOf[rune]) return 0;
    return rules.baseDamage * (rune === rules.counterOf[target] ? rules.weaknessMultiplier : 1);
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
  const runes = playerHit ? game.incoming : game.submitted;
  const elements = runes.filter((_, index) => game.hits[index] > 0);
  return elements.length ? {
    id: `${game.id}:${game.turn}`, target: playerHit ? "player" : "enemy", elements,
  } : null;
}

export const inputPhases = ["defend", "attack"];
const windowMs = (game) => game.level.comboLength * game.level.secondsPerRune * 1000;
const phase = (game, name, now, duration = 0, extra = {}) => ({
  ...game, phase: name, turn: game.turn + 1, deadline: now + duration,
  remaining: duration, paused: false, pending: false, feedback: "", ...extra,
});

export function openDuel(run, now, enemy, sequence) {
  const level = levelAt(run.score);
  return phase(run, "preview", now, rules.previewSeconds * 1000, {
    level, enemy, duel: run.wins + 1, incoming: sequence, submitted: [], counters: [],
    playerHP: rules.startingHP, enemyHP: rules.startingHP,
    highest: Math.max(run.highest, level.level), perfect: 0, hits: [],
  });
}

function commitTurn(game, now, random) {
  if (game.phase === "attack") {
    if (!game.submitted.length) {
      return phase(game, "attackResult", now, 900, { hits: [], feedback: "No spell cast." });
    }
    return phase(game, "enemyDefense", now, 750, {
      counters: enemyCounters(game.submitted, game.level, random),
    });
  }
  const hits = resolveHits(game.incoming, game.submitted, game.player);
  const damage = hits.reduce((sum, hit) => sum + hit, 0);
  const playerHP = Math.max(0, game.playerHP - damage);
  return phase(game, playerHP ? "defenseResult" : "over", now, 950, {
    hits, playerHP, perfect: game.perfect + Number(damage === 0),
    feedback: damage ? `You took ${damage} damage.` : "Every rune blocked.",
  });
}

export function advance(game, event) {
  const { now, random = Math.random } = event;
  if (event.turn !== game.turn || event.id !== game.id) return game;
  if (event.type === "pause" && !game.paused && !["won", "over"].includes(game.phase)) {
    return { ...game, paused: true, remaining: Math.max(0, game.deadline - now) };
  }
  if (event.type === "resume" && game.paused) {
    const resumed = { ...game, paused: false, deadline: now + game.remaining };
    if (inputPhases.includes(game.phase) && !game.pending && game.submitted.length === game.level.comboLength) {
      return commitTurn(resumed, now, random);
    }
    return resumed;
  }
  const acceptsInput = inputPhases.includes(game.phase) && !game.paused && now < game.deadline;
  if (event.type === "release" && acceptsInput && !game.pending) {
    return { ...game, pending: true, feedback: "" };
  }
  if (event.type === "prediction" && game.pending) {
    const submitted = event.rune ? [...game.submitted, event.rune] : game.submitted;
    const next = { ...game, submitted, pending: false, feedback: event.message || "" };
    return !next.paused && (now >= game.deadline || submitted.length === game.level.comboLength)
      ? commitTurn(next, now, random) : next;
  }
  if (event.type === "undo" && acceptsInput && !game.pending) {
    return { ...game, submitted: game.submitted.slice(0, -1) };
  }
  if (event.type === "cast" && acceptsInput && !game.pending && game.phase === "attack" && game.submitted.length) {
    return commitTurn(game, now, random);
  }
  if (event.type !== "tick" || game.paused || now < game.deadline || game.pending) return game;
  switch (game.phase) {
    case "preview": return phase(game, "defend", now, windowMs(game), { submitted: [] });
    case "defend":
    case "attack": return commitTurn(game, now, random);
    case "defenseResult": return phase(game, "attack", now, windowMs(game), { submitted: [], counters: [] });
    case "enemyDefense": {
      const hits = resolveHits(game.submitted, game.counters, game.enemy);
      const damage = hits.reduce((sum, hit) => sum + hit, 0);
      const enemyHP = Math.max(0, game.enemyHP - damage);
      if (enemyHP) {
        return phase(game, "attackResult", now, 950, {
          hits, enemyHP, feedback: damage ? `Opponent took ${damage} damage.` : "Opponent blocked every rune.",
        });
      }
      const points = victoryPoints(game.level.level, game.playerHP, game.perfect);
      return phase(game, "won", now, 0, {
        hits, enemyHP, points, score: game.score + points, wins: game.wins + 1,
      });
    }
    case "attackResult": return phase(game, "preview", now, rules.previewSeconds * 1000, {
      incoming: enemySequence(game.level, game.player, random), submitted: [], counters: [], hits: [],
    });
    default: return game;
  }
}
