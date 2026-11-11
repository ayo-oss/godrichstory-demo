// LsysPythagorasTree — vanilla 판(run/328/demo/02-lsys-pythagoras-tree/index.html) 의 React 포트.
// 정사각형 위에 직각삼각형(빗변을 아래 변으로)을 얹고 그 빗변에 다시 정사각형 둘을 붙이는 재귀.
// 움직임 = 세대 성장(0→8) + 자란 뒤 계절 색 순환(초록 여름 → 호박 가을 → 다시 봄) + 미세 흔들림.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LsysPythagorasTree.module.scss";

export type LsysPythagorasTreeProps = {
  duration?: string;
  easing?: string;
  color?: string;
  side0?: number;   // 첫 정사각형 한 변(무대 세로 배율)
  cycle?: number;
  maxGen?: number;  // 최대 세대
};

const SIDE0 = 0.21;
const CYCLE = 2.0;
const MAXGEN = 8;

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const HINT_TEXT = "정사각형 위에 빗변을 밑변으로 삼는 정사각형 둘을 얹는 규칙을 0 → 1 → 2 세대로 되짚으면 관 모양 숲이 자라는데, 세대가 늘수록 면은 줄고 변은 늘어나 프랙탈 차원이 2 에 다가갑니다";
const META_LEFT = "한 변 s · 축소 0.707 · 세대 0 → 8";
const META_RIGHT = "canvas · fillRect · requestAnimationFrame";
const FIELD_LABEL = "피타고라스 나무 실험판";

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function rgb(c: RGB): string {
  return "rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")";
}

export default function LsysPythagorasTree({
  duration = "2s",
  easing = "ease-spring",
  color = "#bfe3c8",
  side0 = SIDE0,
  cycle = CYCLE,
  maxGen = MAXGEN
}: LsysPythagorasTreeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ trunk: RGB; leafA: RGB; leafB: RGB; ink: RGB; line: RGB } | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
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

  function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, gen: number, genF: number, seasonT: number): void {
    const col = colRef.current;
    if (!col) return;
    if (s < 0.9 || gen > genF) return;
    const thisF = Math.min(1, genF - gen);
    const drawS = s * thisF;
    if (drawS < 0.5) return;
    const depthT = Math.min(1, gen / maxGen);
    const leaf = mix(col.leafA, col.leafB, seasonT);
    const c = mix(col.trunk, leaf, depthT);
    ctx.fillStyle = rgb(c);
    ctx.beginPath();
    ctx.moveTo(x, y + s);
    ctx.lineTo(x + s, y + s);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x, y);
    ctx.closePath();
    if (thisF < 1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y + s * (1 - thisF), s, s * thisF);
      ctx.clip();
    }
    ctx.fill();
    ctx.strokeStyle = "rgba(" + col.line[0] + "," + col.line[1] + "," + col.line[2] + ",0.28)";
    ctx.lineWidth = 0.75;
    ctx.stroke();
    if (thisF < 1) ctx.restore();

    if (gen + 1 > genF) return;
    const mx = x + s / 2, my = y - s / 2;
    const NS = s / Math.SQRT2;
    const lx = x, ly = y;
    const lcx = lx + Math.cos(-Math.PI * 3 / 4) * NS;
    const lcy = ly + Math.sin(-Math.PI * 3 / 4) * NS;
    drawTree(ctx, lcx, lcy, NS, gen + 1, genF, seasonT);
    const rx = mx, ry = my;
    const rcx = rx + Math.cos(Math.PI * 3 / 4) * NS;
    const rcy = ry + Math.sin(Math.PI * 3 / 4) * NS;
    drawTree(ctx, rcx, rcy, NS, gen + 1, genF, seasonT);
  }

  function draw(loop: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !col) return;
    const grPhase = Math.min(loop / 0.55, 1);
    const genF = grPhase * maxGen;
    let seasonT = 0.5 - 0.5 * Math.cos((loop - 0.55) / 0.45 * Math.PI * 2);
    if (loop < 0.55) seasonT = 0;

    ctx.fillStyle = rgb(col.ink);
    ctx.fillRect(0, 0, W, H);

    const s0 = H * side0;
    const cx = W * 0.5, cy = H * 0.94;
    const sway = loop >= 0.55 ? Math.sin(loop * Math.PI * 5) * 0.028 : 0;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(sway);
    ctx.translate(-cx, -cy);
    drawTree(ctx, cx - s0 / 2, cy - s0, s0, 0, genF, seasonT);
    ctx.restore();
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
      trunk: tokRGB(root, "--ls-bark"),
      leafA: tokRGB(root, "--ls-leaf"),
      leafB: tokRGB(root, "--ls-leaf2"),
      ink: tokRGB(root, "--ls-ink"),
      line: tokRGB(root, "--ls-bark2")
    };
    ctxRef.current = cv.getContext("2d");
    fit();
    const reduce = reduced();
    function onResize(): void {
      fit();
      draw(0.8);
    }
    window.addEventListener("resize", onResize);
    if (reduce) {
      draw(0.6);
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
  }, [side0, cycle, maxGen]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}><span>{HINT_TEXT}</span></p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>{META_LEFT}</span>
          <span className={`${styles.meta} ${styles.metaDim}`}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}
