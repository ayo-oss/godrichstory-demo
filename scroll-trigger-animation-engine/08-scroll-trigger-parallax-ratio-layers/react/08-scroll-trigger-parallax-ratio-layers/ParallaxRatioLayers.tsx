import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ParallaxRatioLayers.module.scss";

export type ParallaxRatioLayersProps = {
  title?: string;
  attr?: string;
  state?: string;
  stateBold?: string;
  word?: string;
  groupLabel?: string;
  sceneLabel?: string;
  rates?: number[];
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 DOM 요소 타입을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type Box<T> = { current: T };
type KeyEvt = { key: string };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function ParallaxRatioLayers({
  title = "패럴랙스 3층",
  attr = "lerp(cur, tgt, 0.12)",
  state = "세 층이 각기 다른 계수로",
  stateBold = "translate3d",
  word = "SCROLL",
  groupLabel = "패럴랙스 3층 데모",
  sceneLabel = "별과 언덕과 글자 씬 — 스크롤하면 층마다 다른 거리로 움직입니다",
  rates = [0.12, 0.3, 0.55],
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: ParallaxRatioLayersProps) {
  const [live, setLive] = useState(demo);
  const viewRef = useRef<HTMLDivElement>(null) as unknown as Box<HTMLDivElement | null>;
  const layerRefs = useRef<(HTMLElement | null)[]>([]) as unknown as Box<(HTMLElement | null)[]>;

  useEffect(() => {
    if (live) return;
    const view = viewRef.current;
    if (!view) return;
    let raf = 0;
    let current = 0;
    // 매 프레임 목표의 12 퍼센트씩 다가가 0.1px 안으로 좁혀지면 딱 맞춘다
    const tick = () => {
      const target = view.scrollTop;
      current = Math.abs(target - current) < 0.1 ? target : lerp(current, target, 0.12);
      layerRefs.current.forEach((el) => {
        if (!el) return;
        const rate = parseFloat(el.getAttribute("data-rate") || "0") || 0;
        el.style.transform = `translate3d(0, ${(-current * rate).toFixed(2)}px, 0)`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live]);

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  const layerClass = [styles.layerStars, styles.layerHills, styles.layerType];

  return (
    <section
      className={`${styles.px} ${live ? styles.isDemo : ""}`}
      style={vars}
      aria-label={groupLabel}
    >
      <header className={styles.head}>
        <p className={styles.title}>{title}</p>
        <p className={styles.attr}><code>{attr}</code></p>
      </header>
      <div
        className={styles.view}
        ref={viewRef as unknown as Box<HTMLDivElement>}
        onScroll={() => setLive(false)}
        onPointerDown={() => setLive(false)}
        onKeyDown={(e: KeyEvt) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "PageDown" || e.key === "PageUp" || e.key === " ") setLive(false);
        }}
        tabIndex={0}
        role="region"
        aria-label={sceneLabel}
      >
        <div className={styles.scene}>
          <div className={`${styles.layer} ${layerClass[0]}`} data-rate={rates[0]} aria-hidden="true" />
          <div className={`${styles.layer} ${layerClass[1]}`} data-rate={rates[1]} aria-hidden="true">
            <svg className={styles.hills} viewBox="0 0 320 130" preserveAspectRatio="none">
              <path className={styles.hillBack} d="M0 130 L0 72 C 34 30, 84 16, 128 46 C 168 74, 206 78, 244 62 C 276 48, 302 52, 320 60 L320 130 Z" />
              <path className={styles.hillFront} d="M0 130 L0 100 C 50 62, 100 68, 148 88 C 198 110, 250 92, 320 70 L320 130 Z" />
            </svg>
          </div>
          <div className={`${styles.layer} ${layerClass[2]}`} data-rate={rates[2]}>
            <p className={styles.word}>{word}</p>
          </div>
        </div>
        <div className={styles.spacer} aria-hidden="true" />
      </div>
      <footer className={styles.foot}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.state}>
          {state} <b>{stateBold}</b>
        </span>
      </footer>
    </section>
  );
}
