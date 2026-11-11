// MorphHover — vanilla 판(run/372/demo/06-corner-shape-morph-hover/index.html) 의 React 포트.
// 비율 값을 목표로 순간 이동시키지 않고 지수 감쇠(dt 기반 관성 lerp)로 붙인다.
import { useEffect, useRef } from "react";
import styles from "./MorphHover.module.scss";

type Box<T> = { current: T };

const ROUND_R = 48; // 대기 상태(둥근 원형)의 반경 상한(px)
const BEVEL_R = 6; // 호버 상태(각진 베벨)의 반경 하한(px)
const LERP_K = 9; // 목표 비율로 붙는 속도 상수 — 클수록 빨리 따라붙는다
const AUTO_MS = 2000; // 자동 루프에서 대기·호버를 오가는 주기

export default function MorphHover() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const cardRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const readoutRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SUPPORTS_ROUND = CSS.supports("corner-shape", "round");
    const SUPPORTS_BEVEL = CSS.supports("corner-shape", "bevel");

    const root = rootRef.current;
    const card = cardRef.current;
    const readout = readoutRef.current;
    if (!root || !card || !readout) return;

    let isDemo = true;
    let target = 0;
    let ratio = 0;

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function setTarget(v: number) { target = v; }
    function onEnter() { human(); setTarget(1); }
    function onLeave() { human(); setTarget(0); }
    function onFocus() { human(); setTarget(1); }
    function onBlur() { human(); setTarget(0); }
    function onClick() { human(); card!.setAttribute("aria-pressed", String(target === 1)); }
    card.addEventListener("pointerenter", onEnter);
    card.addEventListener("pointerleave", onLeave);
    card.addEventListener("focus", onFocus);
    card.addEventListener("blur", onBlur);
    card.addEventListener("click", onClick);

    // 계산 겹: 비율 값을 목표로 순간 이동시키지 않고 지수 감쇠(dt 기반 관성 lerp)로 붙인다 — 두 모양 사이 보간 비율이다
    let last = 0;
    function stepRatio(ts: number) {
      const dt = last ? (ts - last) / 1000 : 0;
      last = ts;
      const follow = 1 - Math.exp(-LERP_K * dt);
      ratio += (target - ratio) * follow;
      if (Math.abs(ratio - target) < 0.001) ratio = target;
    }

    function applyMorph() {
      const r = ROUND_R + (BEVEL_R - ROUND_R) * ratio;
      const shape = ratio < 0.5 ? (SUPPORTS_ROUND ? "round" : null) : (SUPPORTS_BEVEL ? "bevel" : null);
      if (shape) (card!.style as any).cornerShape = shape;
      card!.style.borderRadius = r.toFixed(2) + "px";
      readout!.textContent = "보간 비율 " + Math.round(ratio * 100) + "%";
    }

    let start = 0;
    function loop(ts: number) {
      if (!start) start = ts;
      if (isDemo) {
        if (reduce) {
          target = 1;
        } else {
          const t = ((ts - start) % AUTO_MS) / AUTO_MS;
          target = t < 0.5 ? 0 : 1;
        }
      }
      if (reduce) {
        ratio = target;
      } else {
        stepRatio(ts);
      }
      applyMorph();
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      card.removeEventListener("pointerenter", onEnter);
      card.removeEventListener("pointerleave", onLeave);
      card.removeEventListener("focus", onFocus);
      card.removeEventListener("blur", onBlur);
      card.removeEventListener("click", onClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <button
          className={styles.card}
          ref={cardRef}
          type="button"
          aria-pressed="false"
          aria-label="올려서 카드 모양 바꾸기"
        />
        <p className={styles.readout} ref={readoutRef} aria-live="polite">보간 비율 0%</p>
      </div>
    </main>
  );
}
