import { useEffect, useRef } from "react";

export default function AimCanvas({ controls, canAim, enabled, locked, view, onUnlock, onRelease }) {
  const ref = useRef(null);
  const stroke = useRef(null);
  const cursor = useRef(null);

  function clear() {
    const canvas = ref.current;
    const id = stroke.current?.id;
    stroke.current = null;
    if (id !== undefined && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }

  useEffect(() => {
    const canvas = ref.current;
    let hadLock = false;
    function lockChanged() {
      const hasLock = document.pointerLockElement === canvas;
      canvas.parentElement.dataset.mouseLock = String(hasLock);
      cursor.current = null;
      if (hadLock && !hasLock) {
        clear();
        onUnlock.current();
      }
      hadLock = hasLock;
    }
    function resize() {
      clear();
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }
    let requestingLock = false;
    controls.current = {
      clear,
      async lock() {
        const touchOnly = matchMedia("(any-pointer: coarse) and (not (any-pointer: fine))").matches;
        if (touchOnly || requestingLock || document.pointerLockElement || !canvas.requestPointerLock) return;
        requestingLock = true;
        try {
          await canvas.requestPointerLock({ unadjustedMovement: true });
        } catch (error) {
          if (error.name === "NotSupportedError" && canvas.isConnected) {
            try { await canvas.requestPointerLock(); } catch {}
          }
        } finally {
          requestingLock = false;
        }
      },
      unlock() {
        if (document.pointerLockElement === canvas) document.exitPointerLock();
      },
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener("pointerlockchange", lockChanged);
    return () => {
      document.removeEventListener("pointerlockchange", lockChanged);
      controls.current.unlock();
      controls.current = null;
      observer.disconnect();
    };
  }, [controls, onUnlock]);

  useEffect(() => { if (!enabled) clear(); }, [enabled]);

  function move(event) {
    if (!canAim || (stroke.current && stroke.current.id !== event.pointerId)) return;
    const next = { x: event.clientX, y: event.clientY };
    const previous = cursor.current;
    cursor.current = next;
    if (event.pointerType !== "mouse" && !stroke.current) return;
    const hasLock = document.pointerLockElement === ref.current;
    const dx = hasLock ? event.movementX : previous ? next.x - previous.x : 0;
    const dy = hasLock ? event.movementY : previous ? next.y - previous.y : 0;
    if (!dx && !dy) return;

    const aim = view.current;
    const turnRate = .0028 * aim.sensitivity;
    aim.yaw = (aim.yaw + dx * turnRate) % (2 * Math.PI);
    aim.pitch = Math.max(-1.45, Math.min(1.4, aim.pitch - dy * turnRate));
    if (!stroke.current) return;

    const canvas = ref.current;
    const points = stroke.current.points;
    const last = points.at(-1);
    const end = { x: last.x + dx, y: last.y + dy };
    points.push(end);
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = 4;
    context.lineCap = context.lineJoin = "round";
    context.strokeStyle = "#fff0fd";
    context.shadowBlur = 10;
    context.shadowColor = "#d98aff";
    context.beginPath();
    for (const [index, point] of points.entries()) {
      context[index ? "lineTo" : "moveTo"](canvas.width / 2 + point.x - end.x, canvas.height / 2 + point.y - end.y);
    }
    context.stroke();
  }

  return <div className={`air-casting${canAim ? " active" : ""}${enabled ? " drawable" : ""}${locked ? " reading" : ""}`}>
    <div className="aim-point" aria-hidden="true" />
    <canvas ref={ref} aria-label="Hold the primary button or touch and drag to trace a rune with the crosshair"
      aria-disabled={!enabled || locked}
      onPointerDown={(event) => {
        if (!canAim || event.button !== 0) return;
        if (!enabled || locked || stroke.current) return;
        clear();
        cursor.current = { x: event.clientX, y: event.clientY };
        if (document.pointerLockElement !== ref.current) ref.current.setPointerCapture(event.pointerId);
        stroke.current = { id: event.pointerId, points: [{ x: 0, y: 0 }] };
      }}
      onPointerMove={move}
      onPointerLeave={() => { cursor.current = null; }}
      onPointerUp={(event) => {
        if (stroke.current?.id !== event.pointerId) return;
        const points = stroke.current.points;
        stroke.current = null;
        onRelease(points);
      }}
      onPointerCancel={clear}
      onLostPointerCapture={() => { if (stroke.current) clear(); }}
    />
  </div>;
}
