// SpinWheelEntryEditor — vanilla 판(run/332/demo/07-spin-wheel-entry-editor/index.html) 의 React 포트.
// 이름을 고치면 칸 수가 그대로 각도 분할에 반영되고, 각 칸 글자 크기는 fitFont() 가 호 길이에
// 맞게 measureText 이분 탐색(7회)으로 줄인다. "칸 추가"는 MAXN=7 까지만 늘린다.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, ChangeEvent } from "react";
import styles from "./SpinWheelEntryEditor.module.scss";

// demo.py 의 ambient react 스텁은 KeyboardEvent 를 export 하지 않는다 — 최소 자체 타입으로 대체
type KeyEvt = { key: string; preventDefault(): void };

export type SpinWheelEntryEditorProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const TAU = Math.PI * 2;
const MAXN = 7;
const FRICTION = 0.32, STOP = 0.5;
const FLICKS = [8, -10, 6.5];
const PAL = ["#b3bfd4", "#d9c48f", "#a9c4b0", "#c2a8d1", "#d8a3b4"];
const INK = "#17141a";
const CREAM = "#fff7e6";
const INIT_ENTRIES = ["김하늘", "이준호", "박서연", "최도윤"];
const REDUCE_ENTRIES = ["김하늘", "이준호", "박서연", "최도윤", "정민준", "한수아", "새 항목"];
const HINT = "이름을 고치면 칸 각도와 글자 크기가 함께 다시 계산됩니다 — measureText 이분 탐색";
const ARIA_FIELD = "항목 편집기 실험판";
const META_LABEL = "지금 ";
const META_UNIT = "칸";
const META_DRAG = "드래그로 돌리고 놓으면 돌아갑니다";
const ADD_LABEL = "칸 추가";

export default function SpinWheelEntryEditor({
  duration = "2s",
  easing = "ease-out",
  color = "#2f6df6"
}: SpinWheelEntryEditorProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [entries, setEntries] = useState<string[]>(INIT_ENTRIES);
  const entriesRef = useRef(INIT_ENTRIES) as Box<string[]>;
  const stRef = useRef({
    ang: -0.4, vel: 0, settle: -1, pulse: -1, dpr: 1, fi: 1, idle: 0,
    drag: { on: false, lastA: 0, lastT: 0, v: 0 }
  }) as Box<{
    ang: number; vel: number; settle: number; pulse: number; dpr: number; fi: number; idle: number;
    drag: { on: boolean; lastA: number; lastT: number; v: number };
  }>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function fit(): void {
    const st = stRef.current;
    const field = fieldRef.current, cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    st.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(field.clientWidth * st.dpr);
    cv.height = Math.round(field.clientHeight * st.dpr);
    ctxRef.current = ctx;
  }

  // 호 길이에 맞는 글자 크기 — 이분 탐색. measureText 로 폭을 재며 경계를 좁힌다
  function fitFont(ctx: CanvasRenderingContext2D, text: string, arcLen: number): number {
    let lo = 6, hi = 15, best = 6;
    for (let it = 0; it < 7; it++) {
      const mid = (lo + hi) / 2;
      ctx.font = "700 " + mid + "px sans-serif";
      if (ctx.measureText(text).width <= arcLen) { best = mid; lo = mid; } else { hi = mid; }
    }
    return best;
  }

  function draw(): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const list = entriesRef.current;
    const w = cvRef.current!.width / st.dpr, h = cvRef.current!.height / st.dpr;
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const n = list.length, seg = TAU / n;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 10;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(st.ang);
    for (let k = 0; k < n; k++) {
      const a0 = k * seg, a1 = a0 + seg;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a1); ctx.closePath();
      ctx.fillStyle = PAL[k % PAL.length]; ctx.fill();
      ctx.strokeStyle = "rgba(23,20,26,.20)"; ctx.lineWidth = 1; ctx.stroke();
      const mid = (a0 + a1) / 2;
      const fs = fitFont(ctx, list[k], R * seg * 0.78);
      ctx.save(); ctx.rotate(mid);
      ctx.fillStyle = INK;
      ctx.font = "700 " + fs + "px sans-serif";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(list[k], R - 12, 0);
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU);
    ctx.fillStyle = CREAM; ctx.fill(); ctx.strokeStyle = "rgba(23,20,26,.35)"; ctx.stroke();
    if (st.pulse >= 0) {
      ctx.beginPath(); ctx.arc(0, 0, 12 + st.pulse * 18, 0, TAU);
      ctx.strokeStyle = "rgba(23,20,26," + (1 - st.pulse) * 0.5 + ")";
      ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - R - 8); ctx.lineTo(cx + 6, cy - R - 8); ctx.lineTo(cx, cy - R + 7);
    ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
  }

  function onEntryChange(idx: number, e: ChangeEvent<HTMLInputElement>): void {
    const st = stRef.current;
    const list = entriesRef.current.slice();
    list[idx] = e.target.value || "이름";
    entriesRef.current = list;
    setEntries(list);
    st.idle = 1.2;
    draw();
  }
  function addEntry(): void {
    const st = stRef.current;
    if (entriesRef.current.length >= MAXN) return;
    const list = entriesRef.current.concat(["새 항목"]);
    entriesRef.current = list;
    setEntries(list);
    st.idle = 1.2;
    draw();
  }

  function angleAt(e: PointerEvent<HTMLDivElement>): number {
    const b = e.currentTarget.getBoundingClientRect();
    return Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2));
  }
  function onPointerDown(e: PointerEvent<HTMLDivElement>): void {
    const st = stRef.current;
    st.drag.on = true; st.drag.lastA = angleAt(e); st.drag.lastT = performance.now(); st.drag.v = 0;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 캡처 실패는 회전에 영향 없다 */ }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>): void {
    const st = stRef.current;
    if (!st.drag.on) return;
    const a = angleAt(e), now = performance.now();
    let dA = a - st.drag.lastA;
    if (dA > Math.PI) dA -= TAU;
    if (dA < -Math.PI) dA += TAU;
    st.ang += dA;
    const dt = Math.max(1, now - st.drag.lastT) / 1000;
    st.drag.v = 0.65 * st.drag.v + 0.35 * (dA / dt);
    st.drag.lastA = a; st.drag.lastT = now;
    st.idle = 0;
  }
  function endDrag(): void {
    const st = stRef.current;
    if (!st.drag.on) return;
    st.drag.on = false;
    st.vel = Math.max(-20, Math.min(20, st.drag.v));
    st.settle = -1; st.pulse = -1;
  }
  function onKeyDown(e: KeyEvt): void {
    const st = stRef.current;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      st.vel = FLICKS[st.fi++ % FLICKS.length]; st.settle = -1; st.pulse = -1; st.idle = 0;
    }
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000; lastRef.current = now;
    if (!st.drag.on) {
      if (st.vel !== 0) {
        st.ang += st.vel * dt;
        st.vel *= Math.pow(FRICTION, dt);
        if (Math.abs(st.vel) < STOP) { st.vel = 0; st.settle = 0; st.pulse = 0; }
      } else if (st.idle > 0) { st.idle -= dt; }
      else if (st.settle >= 0) {
        st.settle += dt; st.pulse = Math.min(1, st.settle / 0.3);
        if (st.settle > 0.34) { st.vel = FLICKS[st.fi++ % FLICKS.length]; st.settle = -1; st.pulse = -1; }
      }
    }
    draw();
    rafRef.current = requestAnimationFrame(step);
  }

  useEffect(() => {
    fit();
    function onResize(): void { fit(); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 7칸까지 늘어난 상태로 고정하고 루프는 돌지 않는다
      entriesRef.current = REDUCE_ENTRIES;
      setEntries(REDUCE_ENTRIES);
      const st = stRef.current;
      st.pulse = 0.4; st.settle = 0;
      draw();
      setStill(true);
    } else {
      stRef.current.vel = FLICKS[0];
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootCls = still ? styles.ed + " " + styles.isStill : styles.ed;
  return (
    <main className={styles.stage}>
      <div className={rootCls} style={{ "--duration": duration, "--easing": easing, "--color": color } as Vars}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.row}>
          <div
            className={styles.field}
            ref={fieldRef}
            role="application"
            aria-label={ARIA_FIELD}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <canvas className={styles.cv} ref={cvRef}></canvas>
          </div>
          <div className={styles.side}>
            <div className={styles.inputs}>
              {entries.map((v, idx) => (
                <label key={idx} className={styles.lab}>
                  <input
                    type="text"
                    className={styles.inp}
                    defaultValue={v}
                    maxLength={8}
                    aria-label={String(idx + 1) + "번 항목 이름"}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => onEntryChange(idx, e)}
                  />
                </label>
              ))}
            </div>
            <button type="button" className={styles.btn} disabled={entries.length >= MAXN} onClick={addEntry}>
              {ADD_LABEL}
            </button>
            <p className={styles.meta}>{META_LABEL}<b className={styles.count}>{entries.length}</b><span className={styles.metaUnit}>{META_UNIT}</span></p>
            <p className={styles.meta}>{META_DRAG}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
