// CardStackDepthCycle — vanilla 판(run/399/demo/03-loader-3d-card-stack-depth-cycle/index.html) 의 React 포트.
// 카드 i 의 깊이 순위를 진행률의 연속 모듈러 함수로 계산해 매 프레임 transform·opacity·z-index 를 다시 매긴다.
// 395(캔버스 rAF 물리)·393(포인터 tilt) 과 다른 축 — 깊이 순위 자체를 진행률의 모듈러 함수로 계산한다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./CardStackDepthCycle.module.scss";

export type CardStackDepthCycleProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const CARD_COUNT = 5;
const ZGAP = 22;
const YOFF = 10;
const SHRINK = 0.09;
const OPACITY_STEP = 0.15;
const LOOP = 2;
const REDUCE_P = 0.7;
const FIELD_LABEL = "카드 스택 깊이 순환 진행 실험판";

function rankOf(i: number, s: number): number {
  let r = (i - s) % CARD_COUNT;
  if (r < 0) r += CARD_COUNT;
  return r;
}

export default function CardStackDepthCycle({
  duration = "2s",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: CardStackDepthCycleProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]) as Box<(HTMLDivElement | null)[]>;
  const pausedRef = useRef(false) as Box<boolean>;
  const lastPRef = useRef(0) as Box<number>;
  const t0Ref = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function render(p: number): void {
    lastPRef.current = p;
    const s = p * CARD_COUNT;
    const cards = cardsRef.current;
    for (let i = 0; i < CARD_COUNT; i++) {
      const el = cards[i];
      if (!el) continue;
      const rank = rankOf(i, s);
      const z = -rank * ZGAP;
      const y = rank * YOFF;
      const scale = 1 - rank * SHRINK;
      const op = Math.max(0.25, 1 - rank * OPACITY_STEP);
      el.style.transform = "translateY(" + y + "px) translateZ(" + z + "px) scale(" + scale + ")";
      el.style.opacity = String(op);
      el.style.zIndex = String(Math.round((CARD_COUNT - rank) * 1000));
    }
    if (pctRef.current) pctRef.current.textContent = Math.round(p * 100) + "%";
  }

  function togglePause(): void {
    pausedRef.current = !pausedRef.current;
    const root = rootRef.current;
    if (root) root.classList.toggle("is-paused", pausedRef.current);
    render(reduced() ? REDUCE_P : lastPRef.current);
  }

  function restart(): void {
    t0Ref.current = performance.now();
    render(reduced() ? REDUCE_P : 0);
  }

  function onKey(e: KeyEvt): void {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); togglePause(); }
    else if (e.key === "r" || e.key === "R") { e.preventDefault(); restart(); }
  }

  function onClick(): void {
    togglePause();
  }

  function onResize(): void {
    if (pausedRef.current || reduced()) render(reduced() ? REDUCE_P : lastPRef.current);
  }

  function frame(now: number): void {
    if (!pausedRef.current) {
      const t = (now - t0Ref.current) / 1000;
      render((t % LOOP) / LOOP);
    }
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    t0Ref.current = performance.now();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      const root = rootRef.current;
      if (root) root.classList.add("is-still");
      render(REDUCE_P);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef} style={vars}>
        <p className={styles.hint}>클릭하거나 스페이스바를 누르면 멈추거나 다시 갑니다</p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onClick={onClick}
          onKeyDown={onKey}
        >
          <div className={styles.deck}>
            {[1, 2, 3, 4, 5].map((n, i) => (
              <div key={n} className={styles.card} ref={(el: HTMLDivElement | null) => { cardsRef.current[i] = el; }}>{n}</div>
            ))}
          </div>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>진행</span></b>
        </div>
      </div>
    </main>
  );
}
