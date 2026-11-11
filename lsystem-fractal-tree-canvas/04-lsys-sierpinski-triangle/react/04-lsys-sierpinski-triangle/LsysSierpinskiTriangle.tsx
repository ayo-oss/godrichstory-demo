// LsysSierpinskiTriangle — vanilla 판(run/328/demo/04-lsys-sierpinski-triangle/index.html) 의 React 포트.
// 화살촉(Arrowhead) L-시스템: A,B 두 기호가 서로를 끼워 넣으며 자라는 한붓그리기 곡선이
// 세대가 늘수록 삼각형 가스켓의 구멍을 정확히 남긴다.
// 움직임 = 세대 크로스페이드 성장(0→6) + 완성 뒤 곡선을 따라 도는 빛 한 점.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LsysSierpinskiTriangle.module.scss";

export type LsysSierpinskiTriangleProps = {
  duration?: string;
  easing?: string;
  color?: string;
  angle?: number;
  maxGen?: number;
  cycle?: number;
};

const ANGLE = 60;
const MAXGEN = 6;
const CYCLE = 2.0;

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type XY = { x: number; y: number };

const HINT_TEXT = "A→B-A-B, B→A+B+A 두 문자를 60° 거북 걸음으로 풀면 한붓그리기 화살촉 곡선이 되는데, 세대를 더할수록 그 곡선이 셸핀스키 삼각형의 빈틈을 그대로 메웁니다";
const META_LEFT_PREFIX = "규칙 A→B-A-B · 각도 60° · 세대 ";
const META_RIGHT = "canvas · 문자 재쓰기 · beginPath";
const FIELD_LABEL = "셸핀스키 삼각형 실험판";

const RULE: Record<string, string> = { A: "B-A-B", B: "A+B+A" };
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

function turtlePath(str: string, step: number, angle: number): XY[] {
  let x = 0, y = 0, a = 0;
  const pts: XY[] = [{ x, y }];
  for (let i = 0; i < str.length; i++) {
    const ch = str.charAt(i);
    if (ch === "A" || ch === "B") {
      x += Math.cos(a) * step;
      y += Math.sin(a) * step;
      pts.push({ x, y });
    } else if (ch === "+") {
      a -= angle * Math.PI / 180;
    } else if (ch === "-") {
      a += angle * Math.PI / 180;
    }
  }
  return pts;
}

const AXIOM = "A";
function buildPoly(angle: number, maxGen: number): XY[][] {
  const strs: string[] = [];
  for (let g = 0; g <= maxGen; g++) strs.push(expand(AXIOM, g));
  const raw: XY[][] = [];
  for (let g2 = 0; g2 <= maxGen; g2++) raw.push(turtlePath(strs[g2], 1 / Math.pow(2, g2), angle));
  const last = raw[maxGen];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < last.length; i++) {
    minX = Math.min(minX, last[i].x); maxX = Math.max(maxX, last[i].x);
    minY = Math.min(minY, last[i].y); maxY = Math.max(maxY, last[i].y);
  }
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const poly: XY[][] = [];
  for (let g3 = 0; g3 <= maxGen; g3++) {
    const norm: XY[] = [];
    for (let j = 0; j < raw[g3].length; j++) {
      norm.push({ x: (raw[g3][j].x - minX) / span, y: (raw[g3][j].y - minY) / span });
    }
    poly.push(norm);
  }
  return poly;
}

function rgba(c: RGB, a: number): string {
  return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")";
}

export default function LsysSierpinskiTriangle({
  duration = "2s",
  easing = "ease-spring",
  color = "#bfe3c8",
  angle = ANGLE,
  maxGen = MAXGEN,
  cycle = CYCLE
}: LsysSierpinskiTriangleProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ line: RGB; glow: RGB; ink: RGB } | null>(null);
  const polyRef = useRef<XY[][]>([]) as Box<XY[][]>;
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
  const [gen, setGen] = useState(0);
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

  function drawPath(ctx: CanvasRenderingContext2D, pts: XY[], ox: number, oy: number, sc: number, col: RGB, alpha: number, lw: number): void {
    if (!pts.length) return;
    ctx.strokeStyle = rgba(col, alpha);
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(ox + pts[0].x * sc, oy + pts[0].y * sc);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(ox + pts[i].x * sc, oy + pts[i].y * sc);
    ctx.stroke();
  }

  function draw(loop: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const POLY = polyRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !col || !POLY.length) return;
    ctx.fillStyle = rgba(col.ink, 1);
    ctx.fillRect(0, 0, W, H);

    const sc = Math.min(W, H) * 0.82;
    const ox = (W - sc) / 2, oy = (H - sc) / 2;

    const grPhase = Math.min(loop / 0.68, 1);
    const genF = grPhase * maxGen;
    const gA = Math.min(maxGen, Math.floor(genF));
    const gB = Math.min(maxGen, gA + 1);
    const f = genF - gA;

    const lwA = Math.min(4.2, Math.max(1.3, sc / Math.pow(2, gA) * 0.62));
    const lwB = Math.min(4.2, Math.max(1.1, sc / Math.pow(2, gB) * 0.62));
    drawPath(ctx, POLY[gA], ox, oy, sc, col.line, 1, lwA);
    if (f > 0 && gB !== gA) drawPath(ctx, POLY[gB], ox, oy, sc, col.glow, f, lwB);

    setGen(gA);

    if (loop >= 0.68) {
      const t = (loop - 0.68) / 0.32;
      const pts = POLY[maxGen];
      const idxF = t * (pts.length - 1);
      const i0 = Math.floor(idxF) % (pts.length - 1);
      const lf = idxF - Math.floor(idxF);
      const p0 = pts[i0], p1 = pts[i0 + 1] || pts[pts.length - 1];
      const lx = ox + (p0.x + (p1.x - p0.x) * lf) * sc;
      const ly = oy + (p0.y + (p1.y - p0.y) * lf) * sc;
      ctx.fillStyle = rgba(col.glow, 0.9);
      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.fill();
    }
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
      line: tokRGB(root, "--ls-bark2"),
      glow: tokRGB(root, "--ls-leaf"),
      ink: tokRGB(root, "--ls-ink")
    };
    polyRef.current = buildPoly(angle, maxGen);
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
  }, [angle, maxGen, cycle]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}><span>{HINT_TEXT}</span></p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>{META_LEFT_PREFIX}<b>{gen}</b></span>
          <span className={`${styles.meta} ${styles.metaDim}`}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}
