// SvSquareDrag — vanilla 판(run/286/demo/01-color-picker-sv-square-drag) 의 React 포트.
// 변수 3개(duration·easing·color)는 props 로 받아 CSS 변수(var(--duration) 등)로 들어온다.
// 상태는 hue·sat·val 세 숫자뿐이다. RGB 는 그때그때 계산해 --r --g --b 로만 넘기고,
// HEX·rgb() 글자는 module.scss 의 counter-set + @counter-style 이 찍는다 — JS 가 글자를 쓰지 않는다.
import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./SvSquareDrag.module.scss";

type KeyEvt = { key: string; shiftKey: boolean; preventDefault(): void };

export type SvSquareDragProps = {
  svLabel?: string;
  hueLabel?: string;
  /** "채도 %s%, 명도 %v%, %x" 처럼 자리표시자 셋을 가진 틀 */
  svFormat?: string;
  /** "색상 %h도" 처럼 자리표시자 하나를 가진 틀 */
  hueFormat?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--hue"?: number;
  "--r"?: number;
  "--g"?: number;
  "--b"?: number;
};

const SV_WIDTH = 264;
const SV_HEIGHT = 80;

// HSV(0~360, 0~1, 0~1) → RGB(0~255). 육각형 여섯 구간을 표로 펴서 분기 없이 고른다
function hsvToRgb(h: number, s: number, v: number): number[] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const faces: number[][] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]];
  return faces[Math.floor(h / 60) % 6].map((n) => Math.round((n + m) * 255));
}

function toHex(rgb: number[]): string {
  return "#" + rgb.map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export default function SvSquareDrag({
  svLabel = "채도와 명도 고르기",
  hueLabel = "색상 고르기",
  svFormat = "채도 %s%, 명도 %v%, %x",
  hueFormat = "색상 %h도",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: SvSquareDragProps) {
  const [live, setLive] = useState(demo);
  const [hue, setHue] = useState(212);
  const [sat, setSat] = useState(0.2);
  const [val, setVal] = useState(1);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  const rgb = hsvToRgb(hue, sat, val);
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--hue": hue,
    "--r": rgb[0],
    "--g": rgb[1],
    "--b": rgb[2],
  };

  function applySquare(e: ReactPointerEvent<HTMLDivElement>) {
    const node = svRef.current;
    if (!node) return;
    const box = node.getBoundingClientRect();
    setSat(clamp01((e.clientX - box.left) / box.width));
    setVal(1 - clamp01((e.clientY - box.top) / box.height));
  }

  function applyHue(e: ReactPointerEvent<HTMLDivElement>) {
    const node = hueRef.current;
    if (!node) return;
    const box = node.getBoundingClientRect();
    setHue(clamp01((e.clientX - box.left) / box.width) * 360);
  }

  function startSquare(e: ReactPointerEvent<HTMLDivElement>) {
    setLive(false);
    // 칸 밖으로 끌어도 이 요소가 계속 포인터를 받는다
    e.currentTarget.setPointerCapture(e.pointerId);
    applySquare(e);
  }

  function startHue(e: ReactPointerEvent<HTMLDivElement>) {
    setLive(false);
    e.currentTarget.setPointerCapture(e.pointerId);
    applyHue(e);
  }

  function dragSquare(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) applySquare(e);
  }

  function dragHue(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) applyHue(e);
  }

  function keySquare(e: KeyEvt) {
    const step = e.shiftKey ? 0.1 : 0.02;
    if (e.key === "ArrowRight") setSat(clamp01(sat + step));
    else if (e.key === "ArrowLeft") setSat(clamp01(sat - step));
    else if (e.key === "ArrowUp") setVal(clamp01(val + step));
    else if (e.key === "ArrowDown") setVal(clamp01(val - step));
    else return;
    e.preventDefault();
    setLive(false);
  }

  function keyHue(e: KeyEvt) {
    const step = e.shiftKey ? 15 : 3;
    if (e.key === "ArrowRight") setHue(Math.min(360, hue + step));
    else if (e.key === "ArrowLeft") setHue(Math.max(0, hue - step));
    else return;
    e.preventDefault();
    setLive(false);
  }

  const svText = svFormat
    .replace("%s", String(Math.round(sat * 100)))
    .replace("%v", String(Math.round(val * 100)))
    .replace("%x", toHex(rgb));
  const hueText = hueFormat.replace("%h", String(Math.round(hue)));
  const dotStyle: CSSProperties = {
    transform: `translate(${(sat * SV_WIDTH).toFixed(1)}px, ${((1 - val) * SV_HEIGHT).toFixed(1)}px) translate(-50%, -50%)`,
  };

  return (
    <div className={[styles.pk, live ? styles.isDemo : ""].filter(Boolean).join(" ")} style={vars}>
      <div
        ref={svRef}
        className={styles.sv}
        role="slider"
        tabIndex={0}
        aria-label={svLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(sat * 100)}
        aria-valuetext={svText}
        onPointerDown={startSquare}
        onPointerMove={dragSquare}
        onKeyDown={keySquare}
      >
        <span className={styles.dot} style={dotStyle} aria-hidden="true" />
      </div>
      <div
        ref={hueRef}
        className={styles.hue}
        role="slider"
        tabIndex={0}
        aria-label={hueLabel}
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hue)}
        aria-valuetext={hueText}
        onPointerDown={startHue}
        onPointerMove={dragHue}
        onKeyDown={keyHue}
      >
        <span className={styles.knob} style={{ left: `${((hue / 360) * 100).toFixed(1)}%` }} aria-hidden="true" />
      </div>
      <div className={styles.read}>
        <span className={styles.chip} aria-hidden="true" />
        <span className={styles.hex} aria-hidden="true" />
        <span className={styles.rgb} aria-hidden="true" />
      </div>
    </div>
  );
}
