// FlipPanelDepthSort — vanilla 판(run/399/demo/07-loader-3d-flip-panel-depth-sort/index.html) 의 React 포트.
// 패널마다 회전 각도(자기 구간 안에서 0→180도 선형)와 깊이 순위("지금 뒤집는 패널까지의 거리")를
// 매 프레임 p 하나로부터 순수 함수로 계산한다 — 01~06 과 다른 축.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./FlipPanelDepthSort.module.scss";

export type FlipPanelDepthSortProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const PANEL_COUNT = 5;
const STEP = 1 / PANEL_COUNT;
const RANK_ZGAP = 22;
const RANK_YOFF = 4;
const LOOP = 2;
const REDUCE_P = 0.7;
const FIELD_LABEL = "플립 패널 깊이 재정렬 진행 실험판";

function currentIndex(p: number): number {
  let idx = Math.floor(p * PANEL_COUNT);
  if (idx > PANEL_COUNT - 1) idx = PANEL_COUNT - 1;
  if (idx < 0) idx = 0;
  return idx;
}
function flipAngle(i: number, p: number): number {
  const start = i * STEP, end = start + STEP;
  if (p < start) return 0;
  if (p >= end) return 180;
  const local = (p - start) / STEP;
  return local * 180;
}
function depthRank(i: number, p: number): number {
  const cur = currentIndex(p);
  return Math.abs(cur - i);
}

export default function FlipPanelDepthSort({
  duration = "2s",
  easing = "linear",
  color = "#fff7e6",
}: FlipPanelDepthSortProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const panelsRef = useRef<(HTMLDivElement | null)[]>(new Array(PANEL_COUNT).fill(null)) as Box<(HTMLDivElement | null)[]>;
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
    const panels = panelsRef.current;
    for (let i = 0; i < PANEL_COUNT; i++) {
      const el = panels[i];
      if (!el) continue;
      const angle = flipAngle(i, p);
      const rank = depthRank(i, p);
      el.style.transform = "translateZ(" + (-rank * RANK_ZGAP) + "px) translateY(" + (rank * RANK_YOFF) + "px) rotateY(" + angle + "deg)";
      el.style.zIndex = String(PANEL_COUNT - rank);
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
          <div className={styles.scene}>
            <div className={styles.stack}>
              {Array.from({ length: PANEL_COUNT }, (_, i) => (
                <div key={i} className={styles.panel} ref={(el: HTMLDivElement | null) => { panelsRef.current[i] = el; }}>
                  <div className={styles.panelFace}>{i + 1}</div>
                  <div className={styles.panelBack}>{i + 1}</div>
                </div>
              ))}
            </div>
          </div>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>진행</span></b>
        </div>
      </div>
    </main>
  );
}
