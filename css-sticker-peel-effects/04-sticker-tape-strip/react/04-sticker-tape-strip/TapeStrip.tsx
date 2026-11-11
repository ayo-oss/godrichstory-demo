// TapeStrip — vanilla 판(run/378/demo/04-sticker-tape-strip/index.html) 의 React 포트.
// 두 테이프의 기울기를 base + i*step 산술식(tapeAngle)으로 얻는다 — 하드코딩 개별값이 아니다.
import { useEffect, useRef } from "react";
import styles from "./TapeStrip.module.scss";

type Box<T> = { current: T };

const TAPE_BASE_ANGLE = 14;
const TAPE_ANGLE_STEP = 8;
const LIFT_MAX_DEG = 10;
const LIFT_MAX_PX = 8;
const TAPE_STRETCH = 6;
const LERP_RATE = 0.17;
const STEP_MS = 550;

function tapeAngle(i: number) {
  const sign = i % 2 === 0 ? -1 : 1;
  return sign * (TAPE_BASE_ANGLE + TAPE_ANGLE_STEP * i);
}
const baseAngleA = tapeAngle(1);
const baseAngleB = tapeAngle(2);

export default function TapeStrip() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const cardRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const tapeARef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const tapeBRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const pinBtnRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = rootRef.current;
    const card = cardRef.current;
    const tapeA = tapeARef.current;
    const tapeB = tapeBRef.current;
    const pinBtn = pinBtnRef.current;
    if (!wrap || !card || !tapeA || !tapeB || !pinBtn) return;

    tapeB.style.transform = "rotate(" + baseAngleB + "deg)";

    let isDemo = true;
    let target = 0;
    let shown = 0;
    let pinned = true;

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }
    function toggle() {
      human();
      pinned = !pinned;
      target = pinned ? 0 : 1;
      pinBtn!.setAttribute("aria-pressed", String(!pinned));
      pinBtn!.textContent = pinned ? "테이프 한쪽 떼기" : "다시 붙이기";
    }
    pinBtn.addEventListener("click", toggle);

    let dir = 1, last = 0;
    function autoAdvance(ts: number) {
      if (ts - last < STEP_MS) return;
      last = ts;
      target = dir > 0 ? 1 : 0;
      dir *= -1;
    }

    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo && !reduce) autoAdvance(ts);
      if (reduce) { shown = target; } else { shown += (target - shown) * LERP_RATE; }
      card!.style.transform = "rotate(" + (LIFT_MAX_DEG * shown).toFixed(2) + "deg) translate(" +
        (LIFT_MAX_PX * shown * 0.6).toFixed(2) + "px, " + (-LIFT_MAX_PX * shown).toFixed(2) + "px)";
      tapeA!.style.transform = "rotate(" + (baseAngleA + TAPE_STRETCH * shown).toFixed(2) + "deg) translateY(" +
        (-LIFT_MAX_PX * 0.6 * shown).toFixed(2) + "px)";
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      pinBtn!.removeEventListener("click", toggle);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.cardZone}>
          <div className={styles.card} ref={cardRef}>
            <span className={styles.cardMark} aria-hidden="true"></span>
          </div>
          <span className={styles.tape + " " + styles.tapeA} ref={tapeARef} aria-hidden="true"></span>
          <span className={styles.tape + " " + styles.tapeB} ref={tapeBRef} aria-hidden="true"></span>
        </div>
        <button className={styles.pinBtn} ref={pinBtnRef} type="button" aria-pressed="false">테이프 한쪽 떼기</button>
      </div>
    </main>
  );
}
