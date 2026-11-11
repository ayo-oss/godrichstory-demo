// PrismFaceFillRotate — vanilla 판(run/399/demo/06-loader-3d-prism-face-fill-rotate/index.html) 의 React 포트.
// 면마다 독립된 문턱(면 순번 / 전체 면수)을 넘으면 FILL_SPAN 폭 동안 선형으로 색이 번지는 램프 함수를 쓴다.
// 01·02·03·04·05 와 다른 축 — 면마다 독립된 문턱 램프 함수로 채움 정도를 계산한다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./PrismFaceFillRotate.module.scss";

export type PrismFaceFillRotateProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const PRISM_SIDES = 6;
const RADIUS = 76;
const ROT_TURNS = 1;
const FILL_SPAN = 1 / (PRISM_SIDES * 2);
const LOOP = 2;
const REDUCE_P = 0.7;
const FIELD_LABEL = "회전 다각기둥 면 채움 진행 실험판";

function fillAmount(i: number, p: number): number {
  const threshold = i / PRISM_SIDES;
  const raw = (p - threshold) / FILL_SPAN;
  if (raw < 0) return 0;
  if (raw > 1) return 1;
  return raw;
}

export default function PrismFaceFillRotate({
  duration = "2s",
  easing = "linear",
  color = "#0a4fe8",
}: PrismFaceFillRotateProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const prismRef = useRef<HTMLDivElement | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const fillsRef = useRef<(HTMLDivElement | null)[]>(new Array(PRISM_SIDES).fill(null)) as Box<(HTMLDivElement | null)[]>;
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
    const rotY = (p * 360 * ROT_TURNS) % 360;
    const prism = prismRef.current;
    if (prism) prism.style.transform = "rotateX(-14deg) rotateY(" + rotY + "deg)";
    const fills = fillsRef.current;
    for (let i = 0; i < PRISM_SIDES; i++) {
      const el = fills[i];
      if (!el) continue;
      el.style.opacity = String(fillAmount(i, p));
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
            <div className={styles.prism} ref={prismRef}>
              {Array.from({ length: PRISM_SIDES }, (_, i) => (
                <div
                  key={i}
                  className={styles.face}
                  style={{ transform: "rotateY(" + (i * (360 / PRISM_SIDES)) + "deg) translateZ(" + RADIUS + "px)" }}
                >
                  <div className={styles.fill} ref={(el: HTMLDivElement | null) => { fillsRef.current[i] = el; }} />
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
