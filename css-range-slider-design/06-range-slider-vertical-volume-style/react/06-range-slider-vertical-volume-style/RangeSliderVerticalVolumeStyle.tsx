// RangeSliderVerticalVolumeStyle — vanilla 판(run/334/demo/06-range-slider-vertical-volume-style/index.html)
// 의 React 포트. 가로 input 을 -90도 회전시켜 세로로 세운다. 좌표계가 함께 돌아 로컬 0%
// (화면 아래)에서 로컬 100%(화면 위) 로 향하므로, 채움 공식은 가로판과 같은 그대로 쓴다 —
// (100% - var(--pct)) 로 반전하면 채움이 화면 맨 위에 떨어져 썸과 분리된다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./RangeSliderVerticalVolumeStyle.module.scss";

export type RangeSliderVerticalVolumeStyleProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };

const HINT = "가로 슬라이더를 -90도 돌려 세우면 좌표계가 함께 돌아, 채움 공식 그대로 아래에서 위로 차오릅니다";
const ARIA_SCENE = "아래에서 위로 차오르는 세로 볼륨 슬라이더 장면";
const RANGE_LABEL = "볼륨";
const UNIT = "채움 = var(--pct) 그대로";

const ICONS: Record<"none" | "low" | "high", string> = {
  none: '<svg viewBox="0 0 256 256" width="20" height="20"><g fill="currentColor"><path d="M80 88v80H32a8 8 0 0 1-8-8V96a8 8 0 0 1 8-8Z" opacity=".35"/><path d="M155.51 24.81a8 8 0 0 0-8.42.88L77.25 80H32a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h45.25l69.84 54.31A8 8 0 0 0 160 224V32a8 8 0 0 0-4.49-7.19M32 96h40v64H32Zm112 111.64l-56-43.55V91.91l56-43.55Z"/></g></svg>',
  low: '<svg viewBox="0 0 256 256" width="20" height="20"><g fill="currentColor"><path d="M80 88v80H32a8 8 0 0 1-8-8V96a8 8 0 0 1 8-8Z" opacity=".35"/><path d="M155.51 24.81a8 8 0 0 0-8.42.88L77.25 80H32a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h45.25l69.84 54.31A8 8 0 0 0 160 224V32a8 8 0 0 0-4.49-7.19M32 96h40v64H32Zm112 111.64l-56-43.55V91.91l56-43.55ZM208 128a39.93 39.93 0 0 1-10 26.46a8 8 0 0 1-12-10.58a24 24 0 0 0 0-31.72a8 8 0 1 1 12-10.58A40 40 0 0 1 208 128"/></g></svg>',
  high: '<svg viewBox="0 0 256 256" width="20" height="20"><g fill="currentColor"><path d="M80 88v80H32a8 8 0 0 1-8-8V96a8 8 0 0 1 8-8Z" opacity=".35"/><path d="M155.51 24.81a8 8 0 0 0-8.42.88L77.25 80H32a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h45.25l69.84 54.31A8 8 0 0 0 160 224V32a8 8 0 0 0-4.49-7.19M32 96h40v64H32Zm112 111.64l-56-43.55V91.91l56-43.55Zm54-106.08a40 40 0 0 1 0 52.88a8 8 0 0 1-12-10.58a24 24 0 0 0 0-31.72a8 8 0 0 1 12-10.58M248 128a79.9 79.9 0 0 1-20.37 53.34a8 8 0 0 1-11.92-10.67a64 64 0 0 0 0-85.33a8 8 0 1 1 11.92-10.67A79.83 79.83 0 0 1 248 128"/></g></svg>'
};

const MIN = 0, MAX = 100;
const TAU = 0.13;
const TARGETS = [60, 2, 88, 30, 100, 60];
const SEG_MS = 400;

function iconFor(v: number): "none" | "low" | "high" {
  if (v <= 1) return "none";
  if (v < 40) return "low";
  return "high";
}

export default function RangeSliderVerticalVolumeStyle({
  duration = "220ms",
  easing = "ease-out",
  color = "#2f6df6"
}: RangeSliderVerticalVolumeStyleProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rangeRef = useRef<HTMLInputElement | null>(null);
  const pctRef = useRef<HTMLElement | null>(null);
  const iconRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const wrap = wrapRef.current;
    const range = rangeRef.current;
    const pctEl = pctRef.current;
    const iconEl = iconRef.current;
    if (!wrap || !range || !pctEl || !iconEl) return;

    let lastIcon = "";
    function paint(v: number): void {
      const pct = ((v - MIN) / (MAX - MIN)) * 100;
      wrap!.style.setProperty("--pct", pct.toFixed(2));
      pctEl!.textContent = Math.round(pct) + "%";
      range!.setAttribute("aria-valuenow", String(Math.round(v)));
      const key = iconFor(v);
      if (key !== lastIcon) { iconEl!.innerHTML = ICONS[key]; lastIcon = key; }
    }

    let current = 60;
    paint(current);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let playing = true;
    function stop(): void { playing = false; }
    const onInput = (): void => { current = Number(range!.value); paint(current); };
    range.addEventListener("pointerdown", stop);
    range.addEventListener("keydown", stop);
    range.addEventListener("input", onInput);

    let seg = 0, segFrom = current;
    let segClock = performance.now();

    if (reduce) {
      current = TARGETS[0];
      range.value = String(current);
      paint(current);
    } else {
      const step = (now: number): void => {
        if (playing) {
          let elapsed = now - segClock;
          if (elapsed >= SEG_MS) {
            seg = (seg + 1) % TARGETS.length;
            segClock = now; elapsed = 0; segFrom = current;
          }
          const target = TARGETS[seg];
          const t = elapsed / 1000;
          const k = 1 - Math.exp(-t / TAU);
          current = segFrom + (target - segFrom) * k;
          range!.value = String(Math.round(current));
          paint(current);
        }
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      range.removeEventListener("pointerdown", stop);
      range.removeEventListener("keydown", stop);
      range.removeEventListener("input", onInput);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div
        className={styles.vv}
        style={{ "--duration": duration, "--easing": easing, "--color": color } as Vars}
      >
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.row} role="img" aria-label={ARIA_SCENE}>
          <span className={styles.label} aria-hidden="true">VOL</span>
          <div className={styles.col}>
            <div className={styles.wrap} ref={wrapRef}>
              <input
                className={styles.range}
                ref={rangeRef}
                type="range"
                min={0}
                max={100}
                step={1}
                defaultValue={60}
                aria-label={RANGE_LABEL}
              />
            </div>
            <span className={styles.icon} ref={iconRef}></span>
          </div>
        </div>
        <p className={styles.meta}>
          <b className={styles.tag} ref={pctRef}>60%</b>
          <span className={styles.unit}>{UNIT}</span>
        </p>
      </div>
    </main>
  );
}
