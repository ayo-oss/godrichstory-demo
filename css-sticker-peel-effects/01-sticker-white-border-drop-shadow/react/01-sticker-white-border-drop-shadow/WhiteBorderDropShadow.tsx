// WhiteBorderDropShadow — vanilla 판(run/378/demo/01-sticker-white-border-drop-shadow/index.html) 의 React 포트.
// 들어올림 진행도(t)에 비례해 그림자 레이어 5장의 오프셋·흐림·불투명도를 산술로 늘려 쌓아
// 하나의 box-shadow 로 합친다 — 계산 겹은 shadowFor(t) 에 있다.
import { useEffect, useRef } from "react";
import styles from "./WhiteBorderDropShadow.module.scss";

type Box<T> = { current: T };

const LIFT_LAYERS = 5;
const LAYER_OFFSET = 3.6;
const LAYER_BLUR = 6;
const LAYER_ALPHA_BASE = 0.34;
const LAYER_ALPHA_STEP = 0.05;
const LIFT_PX = 18;
const LIFT_SCALE = 0.08;
const LERP_RATE = 0.16;
const STEP_MS = 900;

export default function WhiteBorderDropShadow() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const badgeRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = rootRef.current;
    const badge = badgeRef.current;
    if (!wrap || !badge) return;

    let isDemo = true;
    let target = 0;
    let shown = 0;

    function shadowFor(t: number) {
      const parts: string[] = [];
      for (let i = 1; i <= LIFT_LAYERS; i++) {
        const off = (LAYER_OFFSET * i * t).toFixed(2);
        const blur = (LAYER_BLUR * i * t + 2).toFixed(2);
        const alpha = Math.max(0, LAYER_ALPHA_BASE - LAYER_ALPHA_STEP * i) * t;
        parts.push("0 " + off + "px " + blur + "px rgba(10,8,14," + alpha.toFixed(3) + ")");
      }
      return parts.join(", ");
    }

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }
    function lift() { human(); target = 1; }
    function drop() { human(); target = 0; }
    badge.addEventListener("pointerenter", lift);
    badge.addEventListener("pointerleave", drop);
    badge.addEventListener("focus", lift);
    badge.addEventListener("blur", drop);

    let dir = 1;
    let last = 0;
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
      badge!.style.transform = "translateY(" + (-LIFT_PX * shown).toFixed(2) + "px) scale(" + (1 + LIFT_SCALE * shown).toFixed(3) + ")";
      badge!.style.boxShadow = shadowFor(shown);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      badge!.removeEventListener("pointerenter", lift);
      badge!.removeEventListener("pointerleave", drop);
      badge!.removeEventListener("focus", lift);
      badge!.removeEventListener("blur", drop);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <button className={styles.badge} ref={badgeRef} type="button" aria-label="다이컷 스티커, 마우스를 올리거나 초점을 주면 들어올려진다">
          <span className={styles.badgeMark} aria-hidden="true"></span>
        </button>
      </div>
    </main>
  );
}
