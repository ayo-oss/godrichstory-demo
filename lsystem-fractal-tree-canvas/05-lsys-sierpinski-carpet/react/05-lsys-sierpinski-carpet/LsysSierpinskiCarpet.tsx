// LsysSierpinskiCarpet — vanilla 판(run/328/demo/05-lsys-sierpinski-carpet/index.html) 의 React 포트.
// 채움 칸 하나(1)를 3×3 아홉 칸으로 다시 쓰되 가운데만 구멍(0)으로 남기는 문자 재쓰기(1→111101111)를
// 세대마다 8칸에 재귀 적용한다. 채워진 픽셀 수를 getImageData 로 직접 세어 "남은 넓이 %" 를 표시 — 실측값.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LsysSierpinskiCarpet.module.scss";

export type LsysSierpinskiCarpetProps = {
  duration?: string;
  easing?: string;
  color?: string;
  maxGen?: number;
  cycle?: number;
};

const MAXGEN = 4;
const CYCLE = 2.0;

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const HINT_TEXT = "문자 1(채움)을 3×3 아홉 칸 중 가운데만 0(구멍)으로 바꾼 아홉 글자로 되풀이해 바꿔 쓰면, 세대가 늘수록 남은 넓이가 8/9 씩 줄어드는 카펫이 뚫립니다 — getImageData 로 남은 넓이를 직접 셉니다";
const META_RIGHT = "fillRect · getImageData";
const FIELD_LABEL = "셸핀스키 카펫 실험판";

const RULE: Record<string, string> = { "1": "111101111", "0": "000000000" };
function expand(axiom: string, gen: number): string {
  let s = axiom;
  for (let g = 0; g < gen; g++) {
    let out = "";
    for (let i = 0; i < s.length; i++) out += RULE[s.charAt(i)];
    s = out;
  }
  return s;
}

function rgba(c: RGB, a: number): string {
  return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")";
}

export default function LsysSierpinskiCarpet({
  duration = "2s",
  easing = "ease-spring",
  color = "#e6d8bc",
  maxGen = MAXGEN,
  cycle = CYCLE
}: LsysSierpinskiCarpetProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ fill: RGB; ink: RGB } | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const lastAreaTickRef = useRef(-1) as Box<number>;
  const [still, setStill] = useState(false);
  const [gen, setGen] = useState(0);
  const [area, setArea] = useState("100%");
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

  function drawCarpet(ctx: CanvasRenderingContext2D, str: string, gen: number, ox: number, oy: number, side: number, thisF: number): void {
    const n = Math.pow(3, gen);
    const cell = side / n;
    for (let idx = 0; idx < str.length; idx++) {
      if (str.charAt(idx) === "0") continue;
      const row = Math.floor(idx / n), col = idx % n;
      const cx = ox + col * cell, cy = oy + row * cell;
      const pad = cell * (1 - thisF) * 0.5;
      ctx.fillRect(cx + pad, cy + pad, Math.max(0.4, cell - pad * 2), Math.max(0.4, cell - pad * 2));
    }
  }

  function draw(loop: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !col) return;
    ctx.fillStyle = rgba(col.ink, 1);
    ctx.fillRect(0, 0, W, H);

    const side = Math.min(W, H) * 0.84;
    const ox = (W - side) / 2, oy = (H - side) / 2;

    const grPhase = Math.min(loop / 0.6, 1);
    const genF = grPhase * maxGen;
    const gA = Math.min(maxGen, Math.floor(genF));
    const thisF = gA >= maxGen ? 1 : Math.min(1, genF - gA);
    const str = expand("1", gA);

    const breath = loop < 0.6 ? 1 : 0.72 + 0.28 * Math.sin((loop - 0.6) / 0.4 * Math.PI * 3);
    ctx.fillStyle = rgba(col.fill, breath);
    drawCarpet(ctx, str, gA, ox, oy, side, thisF);

    setGen(gA);

    if (gA !== lastAreaTickRef.current) {
      lastAreaTickRef.current = gA;
      try {
        const img = ctx.getImageData(Math.round(ox), Math.round(oy), Math.round(side), Math.round(side));
        const data = img.data;
        let filled = 0;
        const total = data.length / 4;
        for (let p = 0; p < data.length; p += 4) {
          if (data[p] !== col.ink[0] || data[p + 1] !== col.ink[1] || data[p + 2] !== col.ink[2]) filled++;
        }
        setArea(Math.round((filled / total) * 100) + "%");
      } catch (e) { /* 캔버스 판독 실패해도 화면은 그대로 동작 */ }
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
      fill: tokRGB(root, "--ls-bark2"),
      ink: tokRGB(root, "--ls-ink")
    };
    ctxRef.current = cv.getContext("2d");
    fit();
    const reduce = reduced();
    function onResize(): void {
      fit();
      lastAreaTickRef.current = -1;
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
  }, [maxGen, cycle]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}><span>{HINT_TEXT}</span></p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>세대 <b>{gen}</b> · 넓이 <b>{area}</b></span>
          <span className={`${styles.meta} ${styles.metaDim}`}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}
