// LsysTreeWindSway — vanilla 판(run/328/demo/08-lsys-tree-wind-sway/index.html) 의 React 포트.
// F 축 나무(F→F[+F]F[-F]F, 24도)를 완성해 둔 채 각 마디의 흔들림 위상을 깊이(depth)에 비례해 지연시켜
// 바람이 뿌리에서 가지 끝으로 퍼져 나가는 것처럼 보이게 한다. 세기는 sin(t·WIND_HZ) 로 계산.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LsysTreeWindSway.module.scss";

export type LsysTreeWindSwayProps = {
  duration?: string;
  easing?: string;
  color?: string;
  angle?: number;
  maxGen?: number;
  windAmp?: number;
  windHz?: number;
  cycle?: number;
};

const ANGLE = 24;
const MAXGEN = 5;
const WIND_AMP = 30;
const WIND_HZ = 1.6;
const CYCLE = 2.0;

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Stack = { x: number; y: number; a: number; d: number };

const HINT_TEXT = "F→F[+F]F[-F]F 로 완성해 둔 나무에 깊이(depth)마다 위상을 지연시킨 sin(t·1.6Hz) 바람을 더하면, 뿌리는 그대로인데 가지 끝만 크게 흔들리는 실제 나무의 바람 반응을 흉내 낼 수 있습니다";
const META_LEFT_PREFIX = "규칙 F→F[+F]F[-F]F · 바람 ";
const META_RIGHT = "canvas · 위상 지연 · requestAnimationFrame";
const FIELD_LABEL = "바람 흔들림 나무 실험판";

const RULE: Record<string, string> = { F: "F[+F]F[-F]F" };
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

export default function LsysTreeWindSway({
  duration = "2s",
  easing = "ease-spring",
  color = "#bfe3c8",
  angle = ANGLE,
  maxGen = MAXGEN,
  windAmp = WIND_AMP,
  windHz = WIND_HZ,
  cycle = CYCLE
}: LsysTreeWindSwayProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ bark: RGB; leaf: RGB; ink: RGB } | null>(null);
  const strRef = useRef("") as Box<string>;
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
  const [wind, setWind] = useState(0);
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

  function drawWind(ctx: CanvasRenderingContext2D, str: string, ox: number, oy: number, sc: number, stepLen: number, t: number, windStrength: number): void {
    const col = colRef.current;
    if (!col) return;
    let x = 0, y = 0, a = -Math.PI / 2, d = 0;
    const stack: Stack[] = [];
    for (let i = 0; i < str.length; i++) {
      const ch = str.charAt(i);
      if (ch === "F") {
        const phase = t * windHz * Math.PI * 2 - d * 0.35;
        const sway = Math.sin(phase) * (windAmp * Math.PI / 180) * windStrength * Math.min(1, d / 3);
        const aa = a + sway;
        const nx = x + Math.cos(aa) * stepLen;
        const ny = y + Math.sin(aa) * stepLen;
        const tcol = Math.min(1, d / 6);
        const cr = col.bark[0] + (col.leaf[0] - col.bark[0]) * tcol;
        const cg = col.bark[1] + (col.leaf[1] - col.bark[1]) * tcol;
        const cb = col.bark[2] + (col.leaf[2] - col.bark[2]) * tcol;
        ctx.strokeStyle = "rgb(" + (cr | 0) + "," + (cg | 0) + "," + (cb | 0) + ")";
        ctx.lineWidth = Math.max(0.9, 3 * Math.pow(0.74, d));
        ctx.beginPath();
        ctx.moveTo(ox + x * sc, oy + y * sc);
        ctx.lineTo(ox + nx * sc, oy + ny * sc);
        ctx.stroke();
        if (d >= 4) {
          ctx.beginPath();
          ctx.arc(ox + nx * sc, oy + ny * sc, 2.6, 0, Math.PI * 2);
          ctx.fillStyle = "rgb(" + (cr | 0) + "," + (cg | 0) + "," + (cb | 0) + ")";
          ctx.fill();
        }
        x = nx; y = ny; a = aa;
      } else if (ch === "+") {
        a += angle * Math.PI / 180;
      } else if (ch === "-") {
        a -= angle * Math.PI / 180;
      } else if (ch === "[") {
        stack.push({ x, y, a, d });
        d++;
      } else if (ch === "]") {
        const st = stack.pop();
        if (st) { x = st.x; y = st.y; a = st.a; d = st.d; }
      }
    }
  }

  function draw(loop: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const str = strRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !col || !str) return;
    ctx.fillStyle = rgba(col.ink, 1);
    ctx.fillRect(0, 0, W, H);

    const sc = Math.min(W, H) * 0.5;
    const ox = W * 0.5, oy = H * 0.95;
    const t = loop * cycle;

    const windStrength = 0.35 + 0.65 * Math.abs(Math.sin(t * windHz * Math.PI * 0.5));
    setWind(Math.round(windStrength * 100));

    drawWind(ctx, str, ox, oy, sc, sc / Math.pow(1.6, maxGen) * 0.5, t, windStrength);
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
      bark: tokRGB(root, "--ls-bark"),
      leaf: tokRGB(root, "--ls-leaf"),
      ink: tokRGB(root, "--ls-ink")
    };
    strRef.current = expand("F", maxGen);
    ctxRef.current = cv.getContext("2d");
    fit();
    const reduce = reduced();
    function onResize(): void {
      fit();
      draw(0.3);
    }
    window.addEventListener("resize", onResize);
    if (reduce) {
      draw(0.3);
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
  }, [angle, maxGen, windAmp, windHz, cycle]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}><span>{HINT_TEXT}</span></p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>{META_LEFT_PREFIX}<b>{wind}</b>%</span>
          <span className={`${styles.meta} ${styles.metaDim}`}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}
