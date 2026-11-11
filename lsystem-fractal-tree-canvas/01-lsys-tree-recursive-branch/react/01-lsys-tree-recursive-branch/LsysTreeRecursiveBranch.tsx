// LsysTreeRecursiveBranch — vanilla 판(run/328/demo/01-lsys-tree-recursive-branch/index.html) 의 React 포트.
// 줄기 F 를 규칙 F[+F][-F]F 로 세대마다 다시 쓰고 거북이(F=전진, +/-=회전, [/]=스택)로 선분을 적분한다.
// [ ] 스택이 없으면 두 번째 갈래가 첫 갈래 끝에서 시작해 나무가 아니라 지그재그가 된다.
// 움직임 = 세대 성장 애니메이션(0→6세대, 약 1.5초) + 완성 뒤 잎 호흡(가지 끝 밝기 진동).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LsysTreeRecursiveBranch.module.scss";

export type LsysTreeRecursiveBranchProps = {
  duration?: string;
  easing?: string;
  color?: string;
  angle?: number;   // 가지 각도(도) — 25도에 가까운 낮은 각이 침엽수 실루엣
  ratio?: number;   // 세대마다 줄기가 짧아지는 비율
  cycle?: number;   // 성장+호흡 주기(초) — 설정 초(2s)와 같아 한 루프
};

const ANGLE = 26;
const RATIO = 0.74;
const CYCLE = 2.0;

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const HINT_TEXT = "F 하나는 앞으로, + 하나는 회전입니다. F → F[+F][-F]F 를 여섯 세대 다시 쓰는 것만으로 가지가 저절로 뻗는데, 자라는 속도를 한 세대씩 끊어 보면 규칙이 어디서 분기하는지 보입니다";
const META_LEFT = "규칙 F[+F][-F]F · 각도 26° · 세대 0 → 6";
const META_RIGHT = "canvas · 문자 재쓰기 · requestAnimationFrame";
const FIELD_LABEL = "재귀 가지 실험판";

const RULE: Record<string, string> = { F: "F[+F][-F]F" };
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
const GENS: string[] = [];
for (let g = 0; g <= 6; g++) GENS.push(expand("F", g));

// 떠다니는 씨앗 점 7개 — 성장 전 광합성 모티프(결정적 위상)
type Mote = { px: number; py: number; ph: number };
const MOTES: Mote[] = [];
for (let m = 0; m < 7; m++) {
  MOTES.push({ px: 0.12 + 0.76 * ((m * 0.37) % 1), py: 0.2 + 0.5 * ((m * 0.61) % 1), ph: m * 0.9 });
}

export default function LsysTreeRecursiveBranch({
  duration = "2s",
  easing = "ease-out",
  color = "#d8c4a0",
  angle = ANGLE,
  ratio = RATIO,
  cycle = CYCLE
}: LsysTreeRecursiveBranchProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ bark: RGB; bark2: RGB; leaf: RGB; ink: RGB; mote: RGB } | null>(null);
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

  function drawTree(ctx: CanvasRenderingContext2D, str: string, x0: number, y0: number, len0: number, dim: number, drawFrac: number, gen: number, breath: number): void {
    const col = colRef.current;
    if (!col) return;
    let x = x0, y = y0, a = -Math.PI / 2;
    const stackX: number[] = [], stackY: number[] = [], stackA: number[] = [], stackL: number[] = [];
    let depth = 0;
    const maxDepth = Math.max(1, gen);
    for (let i = 0; i < str.length; i++) {
      const ch = str.charAt(i);
      if (ch === "F") {
        const segLen = len0 * Math.pow(ratio, depth);
        const f = (depth >= gen && gen > 0) || gen === 0 ? drawFrac : 1;
        const nx = x + Math.cos(a) * segLen * f;
        const ny = y + Math.sin(a) * segLen * f;
        const t = Math.min(1, depth / maxDepth);
        let cr = col.bark[0] + (col.bark2[0] - col.bark[0]) * t;
        let cg = col.bark[1] + (col.bark2[1] - col.bark[1]) * t;
        let cb = col.bark[2] + (col.bark2[2] - col.bark[2]) * t;
        const isTip = depth >= maxDepth;
        if (isTip) {
          const bl = 0.55 + 0.45 * breath;
          cr = col.bark2[0] + (col.leaf[0] - col.bark2[0]) * bl;
          cg = col.bark2[1] + (col.leaf[1] - col.bark2[1]) * bl;
          cb = col.bark2[2] + (col.leaf[2] - col.bark2[2]) * bl;
        }
        ctx.globalAlpha = dim;
        ctx.strokeStyle = "rgb(" + (cr | 0) + "," + (cg | 0) + "," + (cb | 0) + ")";
        ctx.lineWidth = Math.max(1, 5 * Math.pow(0.62, depth));
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        if (f >= 1) { x = nx; y = ny; }
        if (isTip && f >= 1) {
          ctx.fillStyle = "rgb(" + col.leaf[0] + "," + col.leaf[1] + "," + col.leaf[2] + ")";
          ctx.globalAlpha = dim * (0.16 + 0.18 * breath);
          ctx.beginPath();
          ctx.arc(nx, ny, 6.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = dim * (0.4 + 0.45 * breath);
          ctx.beginPath();
          ctx.arc(nx, ny, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (ch === "+") {
        a -= angle * Math.PI / 180;
      } else if (ch === "-") {
        a += angle * Math.PI / 180;
      } else if (ch === "[") {
        stackX.push(x); stackY.push(y); stackA.push(a); stackL.push(depth);
        depth++;
      } else if (ch === "]") {
        x = stackX.pop() as number; y = stackY.pop() as number; a = stackA.pop() as number; depth = stackL.pop() as number;
      }
    }
  }

  function draw(loop: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !col) return;
    const grPhase = Math.min(loop / 0.72, 1);
    const genF = grPhase * 6;
    const gen = Math.min(6, Math.floor(genF));
    const frac = genF - gen;
    const breath = 0.5 + 0.5 * Math.sin(loop / cycle * Math.PI * 6);

    ctx.fillStyle = "rgb(" + col.ink[0] + "," + col.ink[1] + "," + col.ink[2] + ")";
    ctx.fillRect(0, 0, W, H);

    for (let mo = 0; mo < MOTES.length; mo++) {
      const M = MOTES[mo];
      const wx = M.px + 0.03 * Math.sin(loop / cycle * Math.PI * 2 + M.ph);
      const wy = M.py + 0.05 * Math.cos(loop / cycle * Math.PI * 2 + M.ph * 1.3);
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(loop / cycle * Math.PI * 4 + M.ph);
      ctx.fillStyle = "rgb(" + col.mote[0] + "," + col.mote[1] + "," + col.mote[2] + ")";
      ctx.beginPath();
      ctx.arc(wx * W, wy * H, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(" + col.bark[0] + "," + col.bark[1] + "," + col.bark[2] + ",0.30)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W * 0.12, H * 0.92);
    ctx.lineTo(W * 0.88, H * 0.92);
    ctx.stroke();

    const baseLen = H * 0.24;
    const x0 = W * 0.5, y0 = H * 0.92;
    const strFull = GENS[gen];
    if (gen > 0 && frac > 0) {
      drawTree(ctx, GENS[gen - 1], x0, y0, baseLen, 0.85, 0, gen - 1, 0);
      drawTree(ctx, strFull, x0, y0, baseLen, 1.0, frac, gen, breath);
    } else {
      drawTree(ctx, strFull, x0, y0, baseLen, 1.0, gen === 0 ? Math.min(1, grPhase * 6) : 1, gen, breath);
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
      bark: tokRGB(root, "--ls-bark"),
      bark2: tokRGB(root, "--ls-bark2"),
      leaf: tokRGB(root, "--ls-leaf"),
      ink: tokRGB(root, "--ls-ink"),
      mote: tokRGB(root, "--ls-mote")
    };
    ctxRef.current = cv.getContext("2d");
    fit();
    const reduce = reduced();
    function onResize(): void {
      fit();
      draw(reduce ? 0.8 : 0.8);
    }
    window.addEventListener("resize", onResize);
    if (reduce) {
      draw(0.8);
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
  }, [angle, ratio, cycle]);

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
