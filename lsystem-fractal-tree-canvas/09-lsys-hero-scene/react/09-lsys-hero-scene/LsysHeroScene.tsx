// LsysHeroScene — vanilla 판(run/328/demo/09-lsys-hero-scene/index.html) 의 React 포트.
// 계산 화면 하나가 서비스 첫 화면이 되는 조립. 나무 다섯 그루가 저마다 다른 문자 재쓰기 규칙
// (F→F[+F]F[-F] 류 세 가지를 섞어)으로 자라 문장 위에 이른다.
// 층 3개: ① 숲 캔버스(세대 성장 + 08 과 같은 깊이비례 바람) ② 방사 그라디언트 비네팅
// (createRadialGradient, 매 프레임 다시 그려 숨쉬듯 짙어졌다 옅어진다) ③ 타이포(kicker·title·tag).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LsysHeroScene.module.scss";

export type LsysHeroSceneProps = {
  duration?: string;
  easing?: string;
  color?: string;
  maxGen?: number;
  cycle?: number;
  nTree?: number;
};

const MAXGEN = 4;
const CYCLE = 2.0;
const N_TREE = 5;

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Stack = { x: number; y: number; a: number; d: number };
type Tree = { xFrac: number; str: string; angle: number; scale: number; phase: number; genDelay: number };

const KICKER_TEXT = "문자 하나가 자라면";
const TITLE_LINE1 = "FRACTAL";
const TITLE_LINE2 = "FOREST";
const TAG_TEXT = "규칙이 모여 숲이 됩니다";
const META_LEFT_PREFIX = "나무 ";
const META_LEFT_SUFFIX = "그루 · 규칙 각각 다름";
const META_RIGHT = "canvas · createRadialGradient";
const HERO_LABEL = "대문 숲 히어로 씬";

const RULES: Record<string, string>[] = [
  { F: "F[+F]F[-F]" },
  { F: "F[+F][-F]F" },
  { F: "FF[+F][-F]" }
];
function expand(rule: Record<string, string>, gen: number): string {
  let s = "F";
  for (let g = 0; g < gen; g++) {
    let out = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s.charAt(i);
      out += rule[ch] !== undefined ? rule[ch] : ch;
    }
    s = out;
  }
  return s;
}

function seedTrees(nTree: number, maxGen: number): Tree[] {
  const trees: Tree[] = [];
  for (let i = 0; i < nTree; i++) {
    const rule = RULES[i % RULES.length];
    trees.push({
      xFrac: (i + 0.5) / nTree,
      str: expand(rule, maxGen),
      angle: 20 + (i % 3) * 5,
      scale: 0.85 + (i % 2) * 0.22,
      phase: i * 0.9,
      genDelay: (i % nTree) * 0.06
    });
  }
  return trees;
}

function rgb(c: RGB, a: number): string {
  return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")";
}

export default function LsysHeroScene({
  duration = "2s",
  easing = "ease-spring",
  color = "#4cd4a6",
  maxGen = MAXGEN,
  cycle = CYCLE,
  nTree = N_TREE
}: LsysHeroSceneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const tagRef = useRef<HTMLParagraphElement | null>(null);
  const colRef = useRef<{ bark: RGB; leaf: RGB; ink: RGB; ink2: RGB } | null>(null);
  const treesRef = useRef<Tree[]>([]) as Box<Tree[]>;
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
    const hero = heroRef.current;
    const cv = cvRef.current;
    if (!hero || !cv) return;
    const r = hero.getBoundingClientRect();
    wRef.current = Math.round(r.width);
    hRef.current = Math.round(r.height);
    cv.width = wRef.current;
    cv.height = hRef.current;
  }

  function drawTree(ctx: CanvasRenderingContext2D, tr: Tree, ox: number, oy: number, sc: number, loop: number): void {
    const col = colRef.current;
    if (!col) return;
    const str = tr.str;
    const grPhase = Math.min(Math.max(0, loop - tr.genDelay) / 0.5, 1);
    const drawUpto = Math.floor(str.length * grPhase);
    const windPhase = loop * Math.PI * 2 * 1.4 + tr.phase;

    let x = 0, y = 0, a = -Math.PI / 2;
    const stack: Stack[] = [];
    let depth = 0;
    const maxDepth = maxGen + 1;
    for (let i = 0; i < drawUpto; i++) {
      const ch = str.charAt(i);
      if (ch === "F") {
        const depthT = depth / maxDepth;
        const sway = 10 * depthT * depthT * Math.sin(windPhase + depth * 0.8) * Math.PI / 180;
        a += sway;
        const segLen = tr.scale * 0.11 * Math.pow(0.72, depth);
        const nx = x + Math.cos(a) * segLen;
        const ny = y + Math.sin(a) * segLen;
        const cr = col.bark[0] + (col.leaf[0] - col.bark[0]) * depthT;
        const cg = col.bark[1] + (col.leaf[1] - col.bark[1]) * depthT;
        const cb = col.bark[2] + (col.leaf[2] - col.bark[2]) * depthT;
        ctx.strokeStyle = "rgb(" + (cr | 0) + "," + (cg | 0) + "," + (cb | 0) + ")";
        ctx.lineWidth = Math.max(0.8, 3 * Math.pow(0.68, depth));
        ctx.beginPath();
        ctx.moveTo(ox + x * sc, oy + y * sc);
        ctx.lineTo(ox + nx * sc, oy + ny * sc);
        ctx.stroke();
        x = nx; y = ny;
      } else if (ch === "[") {
        stack.push({ x, y, a, d: depth });
        depth++;
        a += tr.angle * Math.PI / 180;
      } else if (ch === "]") {
        const st = stack.pop();
        if (st) { x = st.x; y = st.y; a = st.a; depth = st.d; }
        a -= tr.angle * Math.PI / 180;
      } else if (ch === "+") {
        a += tr.angle * Math.PI / 180;
      } else if (ch === "-") {
        a -= tr.angle * Math.PI / 180;
      }
    }
  }

  function render(loop: number): void {
    const cv = cvRef.current;
    const col = colRef.current;
    const TREES = treesRef.current;
    const W = wRef.current, H = hRef.current;
    if (!cv || !col) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = rgb(col.ink, 1);
    ctx.fillRect(0, 0, W, H);

    const sc = H * 0.98;
    for (let i = 0; i < TREES.length; i++) {
      const tr = TREES[i];
      drawTree(ctx, tr, W * tr.xFrac, H * 0.98, sc, loop);
    }

    const breath = 0.5 + 0.5 * Math.sin(loop * Math.PI * 2 * 0.6);
    const gx = W * 0.5, gy = H * 0.42;
    const r0 = Math.min(W, H) * (0.08 + 0.02 * breath);
    const r1 = Math.max(W, H) * 0.75;
    const grad = ctx.createRadialGradient(gx, gy, r0, gx, gy, r1);
    grad.addColorStop(0, rgb(col.ink, 0));
    grad.addColorStop(0.55, rgb(col.ink, 0.18 + 0.06 * breath));
    grad.addColorStop(1, rgb(col.ink2, 0.86));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const tagEl = tagRef.current;
    if (tagEl) tagEl.style.opacity = (0.62 + 0.38 * breath).toFixed(2);
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const loop = (((now - t0) / 1000) % cycle) / cycle;
    render(loop);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    colRef.current = {
      bark: tokRGB(root, "--ls-bark"),
      leaf: tokRGB(root, "--ls-leaf"),
      ink: tokRGB(root, "--ls-ink"),
      ink2: tokRGB(root, "--ls-ink2")
    };
    treesRef.current = seedTrees(nTree, maxGen);
    fit();
    const reduce = reduced();
    function onResize(): void {
      fit();
      render(0.9);
    }
    window.addEventListener("resize", onResize);
    if (reduce) {
      render(0.9);
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
  }, [maxGen, cycle, nTree]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <div className={styles.hero} ref={heroRef} role="application" aria-label={HERO_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <div className={styles.veil} aria-hidden="true"></div>
          <div className={styles.copy}>
            <p className={styles.kicker}>{KICKER_TEXT}</p>
            <p className={styles.title}>{TITLE_LINE1}<br />{TITLE_LINE2}</p>
            <p className={styles.tag} ref={tagRef}>{TAG_TEXT}</p>
          </div>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>{META_LEFT_PREFIX}<b>{nTree}</b>{META_LEFT_SUFFIX}</span>
          <span className={`${styles.meta} ${styles.metaDim}`}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}
