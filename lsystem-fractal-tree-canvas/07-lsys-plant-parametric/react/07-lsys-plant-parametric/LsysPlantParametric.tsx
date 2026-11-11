// LsysPlantParametric — vanilla 판(run/328/demo/07-lsys-plant-parametric/index.html) 의 React 포트.
// Prusinkiewicz 고전 식물 L-시스템(X 축, X→F+[[X]-X]-F[-FX]+X, F→FF). 대괄호 [ ] 로 위치·방향을
// 스택에 쌓아 가지치기를 표현하는 전형적 매개변수 문법.
// 움직임 = 세대 크로스페이드 성장(0→5) + 완성 뒤 각도를 서서히 흔들어 "같은 문법·다른 매개변수 = 다른 식물"을 보여준다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LsysPlantParametric.module.scss";

export type LsysPlantParametricProps = {
  duration?: string;
  easing?: string;
  color?: string;
  angle0?: number;  // 기준 분기각(도)
  swing?: number;   // 각도 흔들림 폭(도)
  maxGen?: number;
  cycle?: number;
};

const ANGLE0 = 25;
const SWING = 6;
const MAXGEN = 5;
const CYCLE = 2.0;

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Stack = { x: number; y: number; a: number };

const HINT_TEXT = "X→F+[[X]-X]-F[-FX]+X 한 줄에 F→FF 를 더해 각도·비율 두 숫자만 바꾸면 고사리부터 관목까지 전혀 다른 식물이 같은 문법에서 자라납니다 — 매개변수가 종을 결정합니다";
const META_LEFT_PREFIX = "규칙 X→F+[[X]-X]-F[-FX]+X · 각도 ";
const META_RIGHT = "canvas · globalAlpha";
const FIELD_LABEL = "매개변수 식물 실험판";

const RULE: Record<string, string> = { X: "F+[[X]-X]-F[-FX]+X", F: "FF" };
function expand(axiom: string, gen: number): string {
  let s = axiom;
  for (let g = 0; g < gen; g++) {
    let out = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s.charAt(i);
      out += RULE[ch] !== undefined ? RULE[ch] : ch;
    }
    s = out;
  }
  return s;
}

function rgba(c: RGB, a: number): string {
  return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")";
}

export default function LsysPlantParametric({
  duration = "2s",
  easing = "ease-spring",
  color = "#bfe3c8",
  angle0 = ANGLE0,
  swing = SWING,
  maxGen = MAXGEN,
  cycle = CYCLE
}: LsysPlantParametricProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ stem: RGB; leaf: RGB; ink: RGB } | null>(null);
  const strsRef = useRef<string[]>([]) as Box<string[]>;
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
  const [ang, setAng] = useState(ANGLE0);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const r = field.getBoundingClientRect();
    wRef.current = Math.round(r.width);
    hRef.current = Math.round(r.height);
    cv.width = wRef.current;
    cv.height = hRef.current;
  }

  function drawPlant(ctx: CanvasRenderingContext2D, str: string, x0: number, y0: number, stepLen: number, angleDeg: number, ox: number, oy: number, sc: number, alphaMul: number, drawFrac: number): void {
    const col = colRef.current;
    if (!col) return;
    let x = x0, y = y0, a = -Math.PI / 2;
    const stack: Stack[] = [];
    const n = str.length;
    const drawUpto = Math.floor(n * drawFrac);
    for (let i = 0; i < drawUpto; i++) {
      const ch = str.charAt(i);
      if (ch === "F") {
        const nx = x + Math.cos(a) * stepLen;
        const ny = y + Math.sin(a) * stepLen;
        const depth = stack.length;
        const t = Math.min(1, depth / 6);
        const cr = col.stem[0] + (col.leaf[0] - col.stem[0]) * t;
        const cg = col.stem[1] + (col.leaf[1] - col.stem[1]) * t;
        const cb = col.stem[2] + (col.leaf[2] - col.stem[2]) * t;
        ctx.globalAlpha = alphaMul * (0.55 + 0.45 * t);
        ctx.strokeStyle = "rgb(" + (cr | 0) + "," + (cg | 0) + "," + (cb | 0) + ")";
        ctx.lineWidth = Math.max(0.9, 3.2 * Math.pow(0.72, depth));
        ctx.beginPath();
        ctx.moveTo(ox + x * sc, oy + y * sc);
        ctx.lineTo(ox + nx * sc, oy + ny * sc);
        ctx.stroke();
        if (depth >= 4) {
          ctx.globalAlpha = alphaMul * 0.5;
          ctx.beginPath();
          ctx.arc(ox + nx * sc, oy + ny * sc, 3.2, 0, Math.PI * 2);
          ctx.fillStyle = "rgb(" + (cr | 0) + "," + (cg | 0) + "," + (cb | 0) + ")";
          ctx.fill();
        }
        x = nx; y = ny;
      } else if (ch === "+") {
        a += angleDeg * Math.PI / 180;
      } else if (ch === "-") {
        a -= angleDeg * Math.PI / 180;
      } else if (ch === "[") {
        stack.push({ x, y, a });
      } else if (ch === "]") {
        const st = stack.pop();
        if (st) { x = st.x; y = st.y; a = st.a; }
      }
    }
    ctx.globalAlpha = 1;
  }

  function draw(loop: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const STRS = strsRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !col || !STRS.length) return;
    ctx.fillStyle = rgba(col.ink, 1);
    ctx.fillRect(0, 0, W, H);

    const sc = Math.min(W, H) * 0.16;
    const ox = W * 0.5, oy = H * 0.95;

    const grPhase = Math.min(loop / 0.55, 1);
    const genF = grPhase * maxGen;
    const gA = Math.min(maxGen, Math.floor(genF));
    const drawFrac = gA >= maxGen ? 1 : Math.min(1, genF - gA);

    const angT = loop >= 0.55 ? (loop - 0.55) / 0.45 : 0;
    const angle = angle0 + (loop >= 0.55 ? Math.sin(angT * Math.PI * 3) * swing : 0);

    setAng(Math.round(angle));

    drawPlant(ctx, STRS[gA], 0, 0, 1 / Math.pow(1.55, gA) * 0.62, angle, ox, oy, sc, 1, gA >= maxGen ? 1 : drawFrac);
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const loop = (((now - t0) / 1000) % cycle) / cycle;
    draw(loop);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    colRef.current = {
      stem: tokRGB(root, "--ls-bark"),
      leaf: tokRGB(root, "--ls-leaf"),
      ink: tokRGB(root, "--ls-ink")
    };
    const strs: string[] = [];
    for (let g0 = 0; g0 <= maxGen; g0++) strs.push(expand("X", g0));
    strsRef.current = strs;
    ctxRef.current = cv.getContext("2d");
    fit();
    const reduce = reduced();
    function onResize(): void {
      fit();
      draw(0.8);
    }
    window.addEventListener("resize", onResize);
    if (reduce) {
      draw(0.85);
      setStill(true);
    } else {
      t0 = -1;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angle0, swing, maxGen, cycle]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}><span>{HINT_TEXT}</span></p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>{META_LEFT_PREFIX}<b>{ang}</b>°</span>
          <span className={`${styles.meta} ${styles.metaDim}`}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}
