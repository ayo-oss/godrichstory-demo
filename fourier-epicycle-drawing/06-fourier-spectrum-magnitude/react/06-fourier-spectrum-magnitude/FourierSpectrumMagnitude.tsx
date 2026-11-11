// FourierSpectrumMagnitude — vanilla 판(run/321/demo/06-fourier-spectrum-magnitude/index.html) 의 React 포트.
// 스펙트럼 막대 — 주파수 영역의 시각화. |c_k| 를 주파수 축에 세운다.
//   ① 왼쪽 절반: 에피사이클 체인(03 의 별 파이프라인 재사용)이 그림을 그린다.
//   ② 오른쪽 절반: 그 그림의 계수 크기 |c_k| 를 주파수 순(-M/2 ~ +M/2) 막대그래프로 세운다.
//   ③ 시간이 흐르며 별 → 낙서로 계수가 연속 보간되어 막대 무늬(지문)가 실시간으로 바뀐다.
//     별은 저주파 몇 개가 크고, 낙서는 고른 빗이 선다 — 이 대비가 이 항목의 주제다.
// 화면이 사는 장치 — 막대 전체가 매 프레임 다시 그려지고(높이·색이 계속 흔들린다),
// 밑바탕 수평 기준선·스캔 밴드가 흐른다. 체인 쪽 방사 스윕도 함께 돈다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FourierSpectrumMagnitude.module.scss";

export type FourierSpectrumMagnitudeProps = {
  duration?: string;
  easing?: string;
  color?: string;
  nbars?: number;   // 막대 개수(표시할 주파수 슬롯, ±nbars/2)
  morph?: number;   // 별↔낙서 보간 주기(초)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Pt = { x: number; y: number };
type Coef = { freq: number; re: number; im: number; amp: number };
type Used = { freq: number; amp: number; ph: number };

const FIELD_LABEL = "스펙트럼 막대 실험판";
const TAU = Math.PI * 2;
const N = 128;

// ── 두 그림의 경로 ──
function starPath(u: number): Pt {
  const seg = u * 10;
  const i = Math.floor(seg);
  const f = seg - i;
  const a1 = i / 10 * TAU - Math.PI / 2;
  const a2 = (i + 1) / 10 * TAU - Math.PI / 2;
  const r1 = (i % 2 === 0) ? 1 : 0.42;
  const r2 = (i % 2 === 0) ? 0.42 : 1;
  const x1 = Math.cos(a1) * r1, y1 = Math.sin(a1) * r1;
  const x2 = Math.cos(a2) * r2, y2 = Math.sin(a2) * r2;
  return { x: x1 + (x2 - x1) * f, y: y1 + (y2 - y1) * f };
}
function doodlePath(u: number): Pt {
  // 고른 스펙트럼이 나오는 낙서 — 여러 주파수가 비슷한 크기로 섞인 물결 무늬
  const t = u * TAU;
  return {
    x: Math.cos(t) * (0.32 + 0.18 * Math.sin(t * 3) + 0.1 * Math.sin(t * 7 + 1)),
    y: Math.sin(t) * (0.3 + 0.16 * Math.cos(t * 5) + 0.09 * Math.sin(t * 8 + 2))
  };
}
function dft(path: Pt[]): Coef[] {
  const M = path.length;
  const out: Coef[] = [];
  for (let k = 0; k < M; k++) {
    const freq = (k <= M / 2) ? k : k - M;
    let re = 0, im = 0;
    for (let n = 0; n < M; n++) {
      const a = -TAU * k * n / M;
      const c = Math.cos(a), s = Math.sin(a);
      re += path[n].x * c - path[n].y * s;
      im += path[n].x * s + path[n].y * c;
    }
    re /= M; im /= M;
    out.push({ freq: freq, re: re, im: im, amp: Math.sqrt(re * re + im * im) });
  }
  out.sort((a, b) => b.amp - a.amp);
  return out;
}

export default function FourierSpectrumMagnitude({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b7c8ff",
  nbars = 24,
  morph = 2.6
}: FourierSpectrumMagnitudeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ ink: RGB; glow: RGB; hot: RGB } | null>(null);
  const nbarsRef = useRef(nbars) as Box<number>;
  const morphRef = useRef(morph) as Box<number>;
  const starRef = useRef<Pt[]>([]) as Box<Pt[]>;
  const doodleRef = useRef<Pt[]>([]) as Box<Pt[]>;
  const starCRef = useRef<Coef[]>([]) as Box<Coef[]>;
  const doodleCRef = useRef<Coef[]>([]) as Box<Coef[]>;
  const slotStarRef = useRef<Record<number, Coef>>({}) as Box<Record<number, Coef>>;
  const slotDoodleRef = useRef<Record<number, Coef>>({}) as Box<Record<number, Coef>>;
  const coRef = useRef<Used[]>([]) as Box<Used[]>;
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const dprRef = useRef(1) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [cnt, setCnt] = useState("0");
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

  function rgba(c: RGB, a: number): string {
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const r = field.getBoundingClientRect();
    const W = Math.round(r.width), H = Math.round(r.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    wRef.current = W; hRef.current = H; dprRef.current = dpr;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = "100%"; cv.style.height = "100%";
    ctxRef.current = cv.getContext("2d");
    if (!starRef.current.length) {
      const STAR: Pt[] = [], DOODLE: Pt[] = [];
      for (let i = 0; i < N; i++) {
        STAR.push(starPath(i / N));
        DOODLE.push(doodlePath(i / N));
      }
      const STARC = dft(STAR);
      const DOODLEC = dft(DOODLE);
      starRef.current = STAR; doodleRef.current = DOODLE;
      starCRef.current = STARC; doodleCRef.current = DOODLEC;
      const slotStar: Record<number, Coef> = {};
      for (let a = 0; a < STARC.length; a++) slotStar[STARC[a].freq] = STARC[a];
      const slotDoodle: Record<number, Coef> = {};
      for (let b = 0; b < DOODLEC.length; b++) slotDoodle[DOODLEC[b].freq] = DOODLEC[b];
      slotStarRef.current = slotStar;
      slotDoodleRef.current = slotDoodle;
    }
  }

  // 보간 계수 — mix 0(별)~1(낙서). 진폭은 lerp, 위상은 별의 위상 우선
  function coefAt(mix: number): Used[] {
    const slotStar = slotStarRef.current;
    const slotDoodle = slotDoodleRef.current;
    const used: Used[] = [];
    const NB = nbarsRef.current;
    for (let fi = -NB / 2; fi <= NB / 2; fi++) {
      if (fi === 0 && mix < 0.5) continue;
      const s = slotStar[fi], d = slotDoodle[fi];
      if (!s || !d) continue;
      used.push({
        freq: fi,
        amp: s.amp + (d.amp - s.amp) * mix,
        ph: 0
      });
    }
    // 위상 채우기
    for (let i = 0; i < used.length; i++) {
      const s2 = slotStar[used[i].freq], d2 = slotDoodle[used[i].freq];
      used[i].ph = Math.atan2(s2.im, s2.re) + (Math.atan2(d2.im, d2.re) - Math.atan2(s2.im, s2.re)) * mix;
    }
    return used;
  }

  function chainAt(u: number, co: Used[]): Pt[] {
    const W = wRef.current, H = hRef.current;
    const base = Math.min(W, H) * 0.34;
    const cx = W * 0.25, cy = H * 0.5;
    const pts: Pt[] = [{ x: cx, y: cy }];
    co.sort((a, b) => b.amp - a.amp);
    for (let i = 0; i < co.length && i < 20; i++) {
      const c = co[i];
      const ang = c.freq * u * TAU + c.ph;
      pts.push({
        x: pts[i].x + Math.cos(ang) * c.amp * base,
        y: pts[i].y + Math.sin(ang) * c.amp * base
      });
    }
    return pts;
  }

  function draw(t: number): Pt {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const dpr = dprRef.current;
    const W = wRef.current, H = hRef.current;
    const NB = nbarsRef.current;
    if (!ctx || !col) return { x: 0, y: 0 };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "rgb(" + col.ink[0] + "," + col.ink[1] + "," + col.ink[2] + ")";
    ctx.fillRect(0, 0, W, H);

    const mix = 0.5 - 0.5 * Math.cos(t * TAU / morphRef.current);   // 0↔1 왕복
    const CO = coefAt(mix);
    coRef.current = CO;

    // ── 왼쪽: 체인 ──
    const cx = W * 0.25, cy = H * 0.5;
    const maxR = Math.min(W, H) * 0.52;
    const sweep = t * 0.85;
    for (let b = 0; b < 16; b++) {
      ctx.fillStyle = rgba(col.glow, 0.1 * (1 - b / 16));
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, sweep - (b + 1) * 0.06, sweep - b * 0.06);
      ctx.closePath();
      ctx.fill();
    }
    const spin = t * 0.3;
    for (let i = 0; i < 14; i++) {
      const a = spin + (i / 14) * TAU;
      ctx.strokeStyle = rgba(col.glow, i % 2 === 0 ? 0.1 : 0.06);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.stroke();
    }

    const u = (t * 0.5) % 1;
    const pts = chainAt(u, CO);
    const base = Math.min(W, H) * 0.34;
    for (let ci = 0; ci < pts.length - 1; ci++) {
      const r = CO[ci].amp * base;
      if (r > 2) {
        ctx.strokeStyle = rgba(col.glow, 0.1 + 0.01 * ci);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pts[ci].x, pts[ci].y, r, 0, TAU);
        ctx.stroke();
      }
      ctx.strokeStyle = rgba(col.glow, 0.5);
      ctx.beginPath();
      ctx.moveTo(pts[ci].x, pts[ci].y);
      ctx.lineTo(pts[ci + 1].x, pts[ci + 1].y);
      ctx.stroke();
    }
    const pen = pts[pts.length - 1];
    const pulse = 0.5 + 0.5 * Math.sin(t * 8);
    ctx.fillStyle = rgba(col.hot, 0.3);
    ctx.beginPath();
    ctx.arc(pen.x, pen.y, (2.4 + pulse * 2.2) * 2.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(col.hot, 1);
    ctx.beginPath();
    ctx.arc(pen.x, pen.y, 2.4 + pulse * 2.2, 0, TAU);
    ctx.fill();

    // ── 오른쪽: 스펙트럼 ──
    const gx = W * 0.46, gw = W * 0.5, baseY = H * 0.78;
    // 구분선
    ctx.strokeStyle = rgba(col.glow, 0.16);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W * 0.43, 0); ctx.lineTo(W * 0.43, H);
    ctx.stroke();
    // 기준선(밑변·중앙) — 숨쉰다
    ctx.strokeStyle = rgba(col.glow, 0.1 + 0.03 * Math.sin(t * 1.6));
    ctx.beginPath();
    ctx.moveTo(gx, baseY); ctx.lineTo(gx + gw, baseY);
    ctx.moveTo(gx, H * 0.3); ctx.lineTo(gx + gw, H * 0.3);
    ctx.stroke();
    // 스캔 밴드 — 막대 영역을 흐른다(계단 12단)
    const bx = gx + ((t * 60) % (gw + 40)) - 20;
    for (let sb = 0; sb < 12; sb++) {
      ctx.fillStyle = rgba(col.glow, 0.09 * (1 - sb / 12));
      ctx.fillRect(bx - sb * 5, 0, 5, H);
    }
    // 막대 — freq -12~+12 를 좌우로. 현재 mix 의 진폭
    const bw = gw / (NB + 1);
    let maxAmp = 0.02;
    for (let q = 0; q < CO.length; q++) if (CO[q].amp > maxAmp) maxAmp = CO[q].amp;
    for (let qq = 0; qq < CO.length; qq++) {
      const c2 = CO[qq];
      const x = gx + gw / 2 + c2.freq * bw;
      const hbar = (c2.amp / maxAmp) * (H * 0.4);
      const jitter = 1 + 0.06 * Math.sin(t * 5 + c2.freq);
      ctx.fillStyle = rgba(col.glow, 0.4);
      ctx.fillRect(x - bw * 0.28, baseY - hbar * jitter, bw * 0.56, hbar * jitter);
      ctx.fillStyle = rgba(col.hot, 0.9);
      ctx.fillRect(x - bw * 0.28, baseY - hbar * jitter, bw * 0.56, 2.4);
    }
    return pen;
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = (now - t0) / 1000;
    draw(t);
    setCnt(String(nbarsRef.current));
    rafRef.current = requestAnimationFrame(frame);
  }

  function stillFrame(): void {
    draw(morphRef.current * 0.25);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    nbarsRef.current = nbars;
    morphRef.current = morph;
    colRef.current = {
      ink: tokRGB(root, "--fe-ink"),
      glow: tokRGB(root, "--fe-glow"),
      hot: tokRGB(root, "--fe-hot"),
    };
    fit();
    setCnt(String(nbars));
    function onResize(): void {
      fit();
      if (reduced()) stillFrame();
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      stillFrame();
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
  }, [nbars, morph]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>에피사이클 옆에 주파수별 계수 크기를 막대로 세우면, 별은 낮은 주파수 몇 개가 일하고 낙서는 고른 막대가 늘어선다는 식으로 그림의 지문이 드러납니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{cnt}</b> 별에서 낙서로 · 지문 연속 변형</span>
          <span className={styles.metaDim}>canvas · |c_k| spectrum · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
