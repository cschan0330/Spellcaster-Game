import Head from "next/head";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import AimCanvas from "../components/AimCanvas";
import { advance, damageCue, elements, enemySequence, inputPhases, levelAt, openDuel, randomElement, rules } from "../lib/spellcaster-game";
import { loadRecognizer, modelVersion, rasterize } from "../lib/spellcaster-recognizer";

const DuelScene = dynamic(() => import("../components/DuelScene"), { ssr: false });

const titles = {
  preview: "Incoming spell", defend: "Draw your counter", defenseResult: "Defense resolved",
  attack: "Draw your attack", enemyDefense: "Opponent counters", attackResult: "Attack resolved",
  won: "Duel won", over: "Run over",
};
const leaderboardKey = "spellcaster-runs-v1";
const runeVariants = 16;
const runeStrip = (element) => `/assets/enemy-runes/${element}.png`;
const sprite = (element, pose = "idle") => `/assets/wizards/${element}-${pose}.png`;
const now = () => performance.now();
const label = (element) => element[0].toUpperCase() + element.slice(1);

function Rune({ element, named = false }) {
  return <span className={`rune ${element}`} role={named ? undefined : "img"} aria-label={named ? undefined : label(element)}>
    <span className="element-pixel" aria-hidden="true" />
    {named && <span>{label(element)}</span>}
  </span>;
}

function HealthBar({ hp, owner }) {
  const maximum = rules.startingHP;
  return <span className="health-pixels" data-low={hp / maximum <= .3} role="meter"
    aria-label={`${owner} health`} aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={hp}>
    {Array.from({ length: 10 }, (_, index) => {
      const portion = Math.max(0, Math.min(1, hp / maximum * 10 - index));
      return <span key={index} className="health-cell" style={{ "--fill": `${100 * portion}%` }} aria-hidden="true" />;
    })}
  </span>;
}

function storedRuns() {
  try {
    const rows = JSON.parse(localStorage.getItem(leaderboardKey) || "[]");
    return Array.isArray(rows) ? rows.filter((row) => row?.id && Number.isFinite(row.score)) : [];
  } catch { return []; }
}

function Leaderboard({ rows }) {
  return <section className="leaderboard">
    <h2>On this device</h2>
    {rows.length ? <ol>{rows.slice(0, 10).map((row) =>
      <li key={row.id}><span>{row.name}</span><span>{row.score.toLocaleString()} pts · {row.wins} wins</span></li>
    )}</ol> : <p>Finished runs will appear here.</p>}
  </section>;
}

export default function Home() {
  const [game, setGame] = useState(null);
  const [name, setName] = useState("");
  const [mode, setMode] = useState("title");
  const [clock, setClock] = useState(0);
  const [model, setModel] = useState("loading");
  const [rows, setRows] = useState([]);
  const [notice, setNotice] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sensitivity, setSensitivity] = useState(1);
  const gameRoot = useRef(null);
  const expandedMode = useRef(false);
  const live = useRef(null);
  const predict = useRef(null);
  const canvas = useRef(null);
  const portraitHost = useRef(null);
  const enemyRunes = useRef([]);
  const lastRuneVariants = useRef(new Map());
  const view = useRef({ yaw: 0, pitch: 0, sensitivity: 1 });
  const onUnlock = useRef(() => send("pause"));
  const saved = useRef(new Set());
  const mounted = useRef(false);

  async function prepare() {
    setModel("loading");
    try {
      predict.current = await loadRecognizer();
      if (mounted.current) setModel("ready");
    } catch {
      if (mounted.current) setModel("error");
    }
  }

  useEffect(() => {
    mounted.current = true;
    setRows(storedRuns());
    try {
      const value = Number(localStorage.getItem("spellcaster-mouse-sensitivity"));
      if (value >= .25 && value <= 3) changeSensitivity(value);
    } catch {}
    function screenChanged() {
      setFullscreen(document.fullscreenElement === gameRoot.current);
    }
    window.addEventListener("keydown", fullscreenKey);
    document.addEventListener("fullscreenchange", screenChanged);
    prepare();
    return () => {
      mounted.current = false;
      window.removeEventListener("keydown", fullscreenKey);
      document.removeEventListener("fullscreenchange", screenChanged);
    };
  }, []);

  function fullscreenKey(event) {
    if (event.key === "Escape" && expandedMode.current) setExpandedMode(false);
    if (event.code !== "KeyF" || event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
        event.target instanceof HTMLInputElement || event.target?.isContentEditable) return;
    event.preventDefault();
    toggleFullscreen();
  }

  async function toggleFullscreen() {
    if (expandedMode.current) {
      setExpandedMode(false);
      return;
    }
    try {
      if (document.fullscreenElement === gameRoot.current) await document.exitFullscreen();
      else await gameRoot.current.requestFullscreen();
    } catch {
      if (!document.fullscreenElement) setExpandedMode(true);
    }
  }

  function setExpandedMode(value) {
    expandedMode.current = value;
    setExpanded(value);
  }

  function changeSensitivity(value) {
    view.current.sensitivity = value;
    setSensitivity(value);
    try { localStorage.setItem("spellcaster-mouse-sensitivity", String(value)); } catch {}
  }

  function publish(next) {
    const previous = live.current;
    if (next?.phase === "preview" && (previous?.id !== next.id || previous?.turn !== next.turn)) {
      enemyRunes.current = next.incoming.map((element) => {
        const last = lastRuneVariants.current.get(element);
        let variant = Math.floor(Math.random() * (runeVariants - Number(last !== undefined)));
        if (last !== undefined && variant >= last) variant++;
        lastRuneVariants.current.set(element, variant);
        return { element, variant };
      });
    }
    live.current = next;
    setGame(next);
  }

  function send(type, target = live.current, payload = {}) {
    const current = live.current;
    if (!current || !target) return null;
    const next = advance(current, { type, id: target.id, turn: target.turn, now: now(), ...payload });
    if (next !== current) {
      if (next.turn !== current.turn || next.paused) canvas.current?.clear();
      publish(next);
      if (next.paused || ["won", "over"].includes(next.phase)) canvas.current?.unlock();
    }
    return next;
  }

  useEffect(() => {
    if (!game || ["won", "over"].includes(game.phase)) return;
    function pulse() {
      const current = live.current;
      const time = now();
      setClock(time);
      if (current && !current.paused && time >= current.deadline) {
        canvas.current?.clear();
        send("tick", current);
      }
    }
    function visibility() { if (document.hidden) send("pause"); }
    function keys(event) {
      if (event.repeat || event.target instanceof HTMLInputElement) return;
      if (event.key === "Escape" && !document.pointerLockElement) send("pause");
      if (live.current?.paused) return;
      if (event.code === "KeyR") recenter();
      if (event.code === "KeyX") canvas.current?.clear();
      if (event.code === "KeyZ") send("undo");
      if (event.code === "Space" && (document.pointerLockElement || event.target === document.body) && live.current?.phase === "attack") {
        event.preventDefault();
        send("cast");
      }
    }
    pulse();
    const timer = setInterval(pulse, 40);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("keydown", keys);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("keydown", keys);
    };
  }, [game?.id, game?.phase]);

  useEffect(() => {
    if (game?.phase !== "over" || saved.current.has(game.id)) return;
    saved.current.add(game.id);
    const row = {
      id: game.id, name: game.name, score: game.score, wins: game.wins,
      highest: game.highest, player: game.player, completed: Date.now(),
      rulesVersion: rules.version, modelVersion,
    };
    const next = [...storedRuns().filter((item) => item.id !== row.id), row].sort((a, b) =>
      b.score - a.score || b.wins - a.wins || b.highest - a.highest || a.completed - b.completed);
    setRows(next);
    try { localStorage.setItem(leaderboardKey, JSON.stringify(next)); }
    catch { setNotice("Local storage is unavailable. This score could not be saved."); }
  }, [game]);

  function begin(run) {
    const time = now();
    setClock(time);
    setNotice("");
    recenter();
    publish(openDuel(run, time, randomElement(), enemySequence(levelAt(run.score), run.player)));
    canvas.current?.lock();
  }
  function recenter() {
    canvas.current?.clear();
    view.current.yaw = 0;
    view.current.pitch = 0;
  }
  function resume() {
    if (live.current?.paused) {
      send("resume");
      canvas.current?.lock();
    }
  }
  function start() {
    if (model !== "ready" || live.current) return;
    begin({
      id: crypto.randomUUID(), turn: 0, player: randomElement(),
      name: Array.from(name.trim()).slice(0, 20).join("") || "Apprentice",
      score: 0, wins: 0, highest: 0,
    });
  }

  useEffect(() => {
    if (game || mode !== "title" || model !== "ready") return;
    function startOnKey(event) {
      if (event.repeat || event.defaultPrevented || event.isComposing ||
          event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
          ["Tab", "Escape", "Shift", "Control", "Alt", "Meta", "CapsLock", "NumLock"].includes(event.key) ||
          /^F\d+$/.test(event.key) || event.code === "KeyF") return;
      if (event.target?.closest?.("button, a, input, select, textarea, [contenteditable]") &&
          ["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      start();
    }
    window.addEventListener("keydown", startOnKey);
    return () => window.removeEventListener("keydown", startOnKey);
  }, [game, mode, model, name]);
  async function recognize(points) {
    const turn = live.current;
    if (!turn || turn.pending || !send("release", turn)?.pending) return;
    try {
      const pixels = rasterize(points);
      if (!pixels) {
        send("prediction", turn, { message: "Draw a longer continuous stroke." });
        return;
      }
      const { rune, score } = await predict.current(pixels);
      const result = score >= 0.60
        ? { rune, message: `Recognized ${label(rune)}.` }
        : { message: "Rune unclear. Try again." };
      send("prediction", turn, result);
    } catch {
      send("prediction", turn, { message: "Recognition failed. Try the stroke again." });
    } finally {
      if (live.current?.id === turn.id && live.current.turn === turn.turn) canvas.current?.clear();
    }
  }
  function finish() {
    const current = live.current;
    if (!current || current.phase === "over" || (!current.paused && current.phase !== "won")) return;
    canvas.current?.clear();
    publish({ ...current, turn: current.turn + 1, phase: "over", paused: false, pending: false, feedback: "Run ended." });
  }

  const active = game && inputPhases.includes(game.phase) && !game.paused && clock < game.deadline;
  const canAim = Boolean(game && !game.paused && !["won", "over"].includes(game.phase));
  const showIncoming = game && ["preview", "defend", "defenseResult"].includes(game.phase);
  const enemy = game?.enemy || "lightning";
  const playerSpell = game?.phase === "enemyDefense" ? game.submitted.at(-1) : null;
  const guard = game?.phase === "enemyDefense"
    ? game.counters.find((counter, index) => counter === rules.counterOf[game.submitted[index]]) : null;
  const defended = game?.phase === "defenseResult" || (game?.phase === "over" && game.playerHP === 0);
  const playerGuard = defended ? game.submitted[game.hits.indexOf(0)] : null;
  const impact = useMemo(() => damageCue(game), [game]);
  const playerAction = game?.phase === "over" && game.playerHP === 0 ? "elimination"
    : game?.phase === "defenseResult" && game.hits.some(Boolean) ? "damage"
    : playerSpell ? "cast"
    : game?.phase === "defenseResult" && game.hits.includes(0) ? "counter" : null;
  const holdingGuard = game?.phase === "attackResult" && game.hits.length > 0 && game.hits.every(hit => hit === 0);
  const pose = game?.phase === "preview" ? "cast" : guard || holdingGuard ? "defend"
    : game?.phase === "won" ? "defeat" : game?.phase === "attackResult" && game.hits.some(Boolean) ? "hurt" : "idle";

  return <>
    <Head>
      <title>Spellcaster | Rune Duels</title>
      <meta name="description" content="Draw elemental runes to attack and counter in an endless wizard duel." />
      {elements.map(element => <link key={element} rel="preload" as="image" href={runeStrip(element)} />)}
    </Head>
    <main className={expanded ? "game expanded" : "game"} ref={gameRoot}>
      <section className={game ? "arena" : "arena title-arena"} data-paused={game?.paused || undefined} aria-label="Wizard duel arena" onClick={(event) => {
        if (!game && mode === "title" && !event.target.closest(".title-menu")) start();
      }}>
        <DuelScene element={enemy} player={game?.player} pose={pose} view={view}
          playerAction={playerAction} impact={impact} guard={guard} playerGuard={playerGuard}
          turn={game?.turn} paused={Boolean(game?.paused)} portraitHost={portraitHost} />
        <img className={`enemy ${pose}`} src={sprite(enemy, pose)} alt={game ? `${label(enemy)} wizard` : ""} />
        <AimCanvas controls={canvas} canAim={canAim} enabled={Boolean(active)} locked={Boolean(game?.pending)}
          view={view} onUnlock={onUnlock} onRelease={recognize} />
        {game && <div className="enemy-vitals">
          <Rune element={enemy} />
          <HealthBar hp={game.enemyHP} owner="Enemy" />
        </div>}
        {game?.phase === "preview" && <div key={game.turn} className="enemy-spells" aria-hidden="true">
          {enemyRunes.current.map(({ element, variant }, index, spells) => <span key={index}
            className={`enemy-spell ${element}`} style={{
              "--cast-delay": `${.28 + index * .075}s`,
              "--cast-spread": `${(index - (spells.length - 1) / 2) * 54}px`,
            }}>
            <span className="enemy-spell-glyph" style={{
              backgroundImage: `url(${runeStrip(element)})`,
              backgroundSize: `${runeVariants * 100}% 100%`,
              backgroundPositionX: `${variant * 100 / (runeVariants - 1)}%`,
            }} />
          </span>)}
        </div>}
        {playerSpell && <div key={`cast-${game.turn}`} className="cast-flight" aria-hidden="true">
          <span className={playerSpell} />
        </div>}
        {["damage", "elimination"].includes(playerAction) &&
          <div key={`damage-${game.turn}`} className="player-hit" aria-hidden="true" />}
        {!game && (mode === "title" ? <>
          <p className="title-announcement" role="status">
            {model === "ready" ? "Press any key to play" : model === "loading" ? "Loading runes…" : "Runes could not load."}
          </p>
          <nav className="title-menu" aria-label="Spellcaster">
            {model === "error" && <button className="primary" onClick={prepare}>Retry loading</button>}
            <button onClick={() => setMode("tutorial")}>How to play</button>
            <button onClick={() => setMode("rankings")}>Rankings</button>
            <button onClick={toggleFullscreen}>{fullscreen ? "Exit fullscreen" : expanded ? "Exit expanded view" : "Fullscreen"}</button>
          </nav>
        </> : <div className="welcome panel">
            {mode === "tutorial" ? <>
              <h1>How to play</h1>
              <p>Move the mouse to look. Hold the primary button and trace a rune with the crosshair, then release. On touch, draw with one finger. Match incoming spells in order, or draw a rune to attack.</p>
              <p>The counter list numbers incoming spells in order. Space casts early. Z undoes, X clears, and R recenters. Press Esc or select your portrait to pause.</p>
              <div className="tutorial-runes">{elements.map((element) => <Rune key={element} element={element} named />)}</div>
            </> : <>
              <Leaderboard rows={rows} />
              <label htmlFor="name">Display name</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Apprentice" />
            </>}
            <button onClick={() => setMode("title")}>Back</button>
        </div>)}
        {game?.paused && <div className="modal panel">
          <h1>Paused</h1>
          <label className="sensitivity" htmlFor="mouse-sensitivity">
            <span>Mouse sensitivity</span><output htmlFor="mouse-sensitivity">{sensitivity.toFixed(2)}×</output>
            <input id="mouse-sensitivity" type="range" min=".25" max="3" step=".05" value={sensitivity}
              onChange={(event) => changeSensitivity(Number(event.target.value))} />
          </label>
          <div className="row actions">
            <button className="primary" onClick={resume}>Resume duel</button>
            <button onClick={toggleFullscreen}>{fullscreen ? "Exit fullscreen" : expanded ? "Exit expanded view" : "Fullscreen"}</button>
            <button onClick={finish}>End and save</button>
          </div>
        </div>}
        {game && ["won", "over"].includes(game.phase) && <div className="modal panel">
          <h1>{titles[game.phase]}</h1>
          <p>{game.phase === "won" ? `+${game.points} points · ` : ""}{game.score.toLocaleString()} total points · {game.wins} wins · Level {game.highest}</p>
          {game.phase === "won" ? <div className="row">
            <button className="primary" onClick={() => { if (live.current?.phase === "won") begin(live.current); }}>Next duel</button>
            <button onClick={finish}>End and save</button>
          </div> : <>
            {notice && <p role="status">{notice}</p>}
            <Leaderboard rows={rows} />
            <button className="primary" onClick={() => { publish(null); setMode("title"); }}>Return to title</button>
          </>}
        </div>}
      {game && <section className="hud" aria-label="Duel HUD">
        <section className="counter-guide panel" aria-label="Counter spell list">
          <ul>{elements.map((element) => {
            const slots = showIncoming ? game.incoming.flatMap((spell, index) => spell === element ? [index + 1] : []) : [];
            return <li key={element} className={slots.length ? "incoming-counter" : undefined}>
              <Rune element={element} named /><span aria-label="countered by">&rarr;</span><Rune element={rules.counterOf[element]} named />
              {slots.length > 0 && <span className="counter-order" aria-label={"Incoming slots " + slots.join(", ")}>{slots.join(" \u00b7 ")}</span>}
            </li>;
          })}</ul>
        </section>
        <div className="player-vitals">
          <button className="player-portrait" type="button" disabled={["won", "over"].includes(game.phase)}
            title={game.paused ? "Resume duel" : "Pause duel"}
            aria-label={`${label(game.player)} wizard. ${game.paused ? "Resume duel" : "Pause duel"}`}
            onClick={game.paused ? resume : () => send("pause")}>
            <span className="portrait-view" ref={portraitHost} aria-hidden="true" />
            <span className="portrait-fallback" aria-hidden="true"><Rune element={game.player} /></span>
          </button>
          <div className="player-health">
            <Rune element={game.player} />
            <HealthBar hp={game.playerHP} owner="Player" />
          </div>
        </div>
        <p className="sr-only" role="status">
          {titles[game.phase]}. {game.feedback} {showIncoming ? `Incoming: ${game.incoming.map(label).join(", ")}.` : ""}
        </p>
      </section>}
      </section>
    </main>
  </>;
}
