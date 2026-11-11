// PushFader — vanilla 판(run/013/demo/04-skeuo-push-slider) 의 React 포트.
// 좌우 드래그·화살표로 캡을 밀고 끝에서 쿠션 눌림이 일어난다. 값·타이밍은 vanilla 와 같다.
// duration·easing·color 는 props 로 받아 CSS 변수로 들어간다(기본값은 vanilla 의 토큰값).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./PushFader.module.scss";

export type PushFaderProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type WrapRef = { current: HTMLSpanElement | null };
type DragState = { current: { startX: number; startPx: number; lastPx: number; active: boolean } };
type PtrEvt = ReactPointerEvent<HTMLButtonElement>;
type KeyEvt = { key: string; preventDefault(): void };

const MAX = 10;
const CAP_W = 48; // .cap 의 고정 폭(vanilla 와 같은 값)
const HINT = "좌우로 밀어 보세요";
const ARIA_LABEL = "채널 페이더";

export default function PushFader({
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ffffff",
}: PushFaderProps) {
  const wrapRef = useRef(null) as WrapRef;
  const drag = useRef({ startX: 0, startPx: 0, lastPx: 0, active: false }) as DragState;
  const [demo, setDemo] = useState(true);
  const [value, setValue] = useState(5);
  const [press, setPress] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function travelPx(): number {
    const wrap = wrapRef.current;
    return wrap ? Math.max(0, wrap.clientWidth - CAP_W) : 0;
  }
  function applyPx(px: number) {
    const wrap = wrapRef.current;
    if (wrap) { wrap.style.setProperty("--x", `${px}px`); }
    drag.current.lastPx = px;
    const t = travelPx();
    setValue(t > 0 ? Math.round((px / t) * MAX) : 0);
  }
  function cushion() {
    setPress(true);
    window.setTimeout(() => { setPress(false); }, 180);
  }

  useEffect(() => {
    applyPx((5 / MAX) * travelPx());
  }, []);

  function onPointerDown(e: PtrEvt) {
    setDemo(false);
    drag.current = { startX: e.clientX, startPx: drag.current.lastPx, lastPx: drag.current.lastPx, active: true };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onPointerMove(e: PtrEvt) {
    if (!drag.current.active) { return; }
    const t = travelPx();
    const px = Math.min(t, Math.max(0, drag.current.startPx + (e.clientX - drag.current.startX)));
    if ((px === 0 && drag.current.lastPx > 0) || (px === t && drag.current.lastPx < t)) { cushion(); }
    applyPx(px);
  }
  function onPointerUp(e: PtrEvt) {
    if (!drag.current.active) { return; }
    drag.current.active = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) { e.currentTarget.releasePointerCapture(e.pointerId); }
  }
  function onKeyDown(e: KeyEvt) {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { next = Math.min(MAX, value + 1); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { next = Math.max(0, value - 1); }
    else if (e.key === "Home") { next = 0; }
    else if (e.key === "End") { next = MAX; }
    if (next === null) { return; }
    e.preventDefault();
    setDemo(false);
    if (next === 0 || next === MAX) { cushion(); }
    applyPx((next / MAX) * travelPx());
  }

  const nums: number[] = [];
  for (let i = 0; i <= MAX; i++) { nums.push(i); }
  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-faders" viewBox="0 0 256 256" fill="currentColor"><g><path d="M200 40v176H56V40Z" opacity=".2"/><path d="M136 120v96a8 8 0 0 1-16 0v-96a8 8 0 0 1 16 0m64 72a8 8 0 0 0-8 8v16a8 8 0 0 0 16 0v-16a8 8 0 0 0-8-8m24-32h-16V40a8 8 0 0 0-16 0v120h-16a8 8 0 0 0 0 16h48a8 8 0 0 0 0-16m-168 0a8 8 0 0 0-8 8v48a8 8 0 0 0 16 0v-48a8 8 0 0 0-8-8m24-32H64V40a8 8 0 0 0-16 0v88H32a8 8 0 0 0 0 16h48a8 8 0 0 0 0-16m72-48h-16V40a8 8 0 0 0-16 0v40h-16a8 8 0 0 0 0 16h48a8 8 0 0 0 0-16"/></g></symbol>
        </defs>
      </svg>
      <div className={cls} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} aria-hidden="true"><use href="#ico-faders" /></svg>
          <span>{HINT}</span>
        </p>
        <button
          className={styles.well}
          type="button"
          role="slider"
          tabIndex={0}
          aria-label={ARIA_LABEL}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={MAX}
          aria-valuenow={value}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <span className={styles.slot} />
          <span className={styles.capWrap} ref={wrapRef}>
            <span className={press ? `${styles.cap} ${styles.press}` : styles.cap}>
              <i className={styles.stripe} />
            </span>
          </span>
        </button>
        <div className={styles.scale} aria-hidden="true">
          {nums.map((n) => (
            <span key={n} className={n === value ? `${styles.num} ${styles.on}` : styles.num}>{n}</span>
          ))}
        </div>
      </div>
    </main>
  );
}
