// StringThreadDecorHero — vanilla 판(run/326/demo/09-string-thread-decor-hero/index.html) 의 React 포트.
// 글자 윤곽을 핀으로 삼아 워드마크를 실로 짜는 히어로. 오프스크린 캔버스에 두 글자("GS" —
// godrichstory 머리글자)를 크게 그려 getImageData 로 읽고, 바깥 홍수 채우기로 바깥 윤곽 링만
// 뽑아 연결 성분(G 링·S 링)으로 나눈 뒤 각 링을 따라 도는 순서로 64개 핀을 정한다.
// 첫 바퀴는 바로 옆 핀을 이어 윤곽을 그리고 둘째 바퀴부터 건너뛴 올로 속을 성기게 채운다 —
// 실이 차오르면 글자가 떠오르고, 뒤편 중앙의 createRadialGradient 스포트라이트가 완성 문장을 비춘다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StringThreadDecorHero.module.scss";

export type StringThreadDecorHeroProps = {
  duration?: string;
  easing?: string;
  color?: string;
  npin?: number;   // 글자 핀 개수
  str?: number;    // 감는 실 올 수
  cycle?: number;  // 감기 완료 주기(초)
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const NPIN  = 64;    // 글자 핀 개수
const STR   = 160;   // 감는 실 올 수
const CYCLE = 2.0;   // 감기 완료 주기(초) — 설정 초(2s)와 같아 한 감기가 한 루프
const SS    = 120;   // 글자 샘플 격자 크기

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type XY = [number, number];
type Run = [number, number, number];   // 글자별 핀 구간 [성분, 시작, 끝)

const BOARD_LABEL = "대문 감기 장면 실험판";
const META_LEFT = "글자 핀 64개 · 실 160올 · 주기 2초";
const META_RIGHT = "createRadialGradient · sin";
const HINT_TITLE = "대문 감기 장면";
const HINT_DESC = "글자 핀에서 실이 순서대로 감겨 브랜드 문장이 완성된다";

export default function StringThreadDecorHero({
  duration = "2s",
  easing = "ease-out",
  color = "#e2d8c3",
  npin = NPIN,
  str = STR,
  cycle = CYCLE
}: StringThreadDecorHeroProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ thrd: RGB; glow: RGB; pin: RGB; panel: RGB } | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const cxRef = useRef(0) as Box<number>;
  const cyRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const pinsRef = useRef<{ pins: XY[]; pinc: number[]; runs: Run[] } | null>(null);
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

  // ── 글자 → 핀 64개(글자별 구간 기록, 0..1 비율) ──
  function buildPins(): { pins: XY[]; pinc: number[]; runs: Run[] } {
    const PINS: XY[] = [], PINC: number[] = [], RUNS: Run[] = [];
    const oc = document.createElement("canvas");
    oc.width = SS; oc.height = SS;
    const o = oc.getContext("2d");
    if (!o) return { pins: PINS, pinc: PINC, runs: RUNS };
    o.fillStyle = "#000"; o.fillRect(0, 0, SS, SS);
    o.fillStyle = "#fff";
    o.font = "900 " + Math.floor(SS * 0.52) + "px sans-serif";
    o.textAlign = "center"; o.textBaseline = "middle";
    o.fillText("G", SS * 0.27, SS * 0.52);
    o.fillText("S", SS * 0.76, SS * 0.52);
    const d = o.getImageData(0, 0, SS, SS).data;
    // 진 글자 픽셀 중 바깥 윤곽만 — 바깥에서 홍수 채우기(BFS)해 닿는 지점.
    // 속(글자 내부) 픽셀은 바깥과 이어지지 않으니 핀에서 제외되고, 얇은 윤곽 링만 남는다
    const ink = new Uint8Array(SS * SS);
    for (let i0 = 0; i0 < SS * SS; i0++) ink[i0] = d[i0 * 4] > 128 ? 1 : 0;
    const seen = new Uint8Array(SS * SS);
    const isIn = new Uint8Array(SS * SS);
    const stack: number[] = [0]; seen[0] = 1;
    const NX = [1, -1, 0, 0], NY = [0, 0, 1, -1];
    while (stack.length) {
      const q = stack.pop() as number;
      const qx = q % SS, qy = (q - qx) / SS;
      for (let d4 = 0; d4 < 4; d4++) {
        const nx = qx + NX[d4], ny = qy + NY[d4];
        if (nx < 0 || ny < 0 || nx >= SS || ny >= SS) continue;
        const qi = ny * SS + nx;
        if (ink[qi]) isIn[q] = 1;   // 바깥 픽셀 옆이 글자 → 윤곽 바로 바깥 점
        else if (!seen[qi]) { seen[qi] = 1; stack.push(qi); }
      }
    }
    // 윤곽 링을 연결 성분으로 나눈다(G 링과 S 링이 따로)
    const ring: number[] = [];
    for (let r0 = 0; r0 < SS * SS; r0++) if (isIn[r0]) ring.push(r0);
    const taken = new Uint8Array(SS * SS);
    const comps: number[][] = [];
    for (let r1 = 0; r1 < ring.length; r1++) {
      if (taken[ring[r1]]) continue;
      const comp: number[] = [ring[r1]], st2: number[] = [ring[r1]];
      taken[ring[r1]] = 1;
      while (st2.length) {
        const q2 = st2.pop() as number;
        const qx2 = q2 % SS, qy2 = (q2 - qx2) / SS;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const nx2 = qx2 + dx, ny2 = qy2 + dy;
            if (nx2 < 0 || ny2 < 0 || nx2 >= SS || ny2 >= SS) continue;
            const qi2 = ny2 * SS + nx2;
            if (isIn[qi2] && !taken[qi2]) { taken[qi2] = 1; comp.push(qi2); st2.push(qi2); }
          }
        }
      }
      comps.push(comp);
    }
    // 성분을 왼쪽부터 정렬 — G 링을 다 감은 뒤 S 링으로 감기가 넘어간다
    comps.sort(function (a: number[], b: number[]): number {
      let ax = SS + 1, bx = SS + 1;
      for (let i2 = 0; i2 < a.length; i2++) { const v = a[i2] % SS; if (v < ax) ax = v; }
      for (let i3 = 0; i3 < b.length; i3++) { const w = b[i3] % SS; if (w < bx) bx = w; }
      return ax - bx;
    });
    // 각 링을 최근접 이웃 경로로 얽는다 — 링이 얇아(몇 픽셀) 경로가 윤곽을 따라 돈다.
    // pathComp 로 각 지점이 몇 번째 글자(성분)인지 함께 남긴다
    const path: XY[] = [], pathComp: number[] = [];
    for (let c0 = 0; c0 < comps.length; c0++) {
      const pts: XY[] = [];
      for (let c1 = 0; c1 < comps[c0].length; c1++) {
        const qq = comps[c0][c1];
        pts.push([qq % SS / SS, ((qq - qq % SS) / SS) / SS]);
      }
      const used: number[] = [];
      let cur2 = 0;
      for (let s2 = 0; s2 < pts.length; s2++) {
        path.push(pts[cur2]); pathComp.push(c0); used[cur2] = 1;
        let bi2 = -1, bd2 = 1e9;
        for (let j2 = 0; j2 < pts.length; j2++) {
          if (used[j2]) continue;
          const ddx = pts[j2][0] - pts[cur2][0], ddy = pts[j2][1] - pts[cur2][1];
          const dd = ddx * ddx + ddy * ddy;
          if (dd < bd2) { bd2 = dd; bi2 = j2; }
        }
        if (bi2 < 0) break;
        cur2 = bi2;
      }
    }
    // 경로를 따라 균등 간격으로 npin개 — 윤곽 위 등 간격 핀.
    // pinc 는 핀의 글자 번호, runs 는 글자별 핀 구간 [시작, 끝) — 채움 올이 글자 안에서만 놀게
    for (let k = 0; k < npin; k++) {
      const pi = Math.floor(k * path.length / npin) % path.length;
      PINS.push(path[pi]);
      PINC.push(pathComp[pi]);
      if (!RUNS.length || RUNS[RUNS.length - 1][0] !== pathComp[pi]) RUNS.push([pathComp[pi], k, k + 1]);
      else RUNS[RUNS.length - 1][2] = k + 1;
    }
    return { pins: PINS, pinc: PINC, runs: RUNS };
  }

  function pinPx(i: number): XY {
    const st = pinsRef.current;
    if (!st) return [0, 0];
    const u = st.pins[i % st.pins.length];
    const s = Math.min(wRef.current, hRef.current);
    // 글자 종횡비 유지 — 늘어나지 않게, 가로만 여유 있게
    return [cxRef.current + (u[0] - 0.5) * s * 1.5, cyRef.current + (u[1] - 0.5) * s * 1.0];
  }

  function fit(): void {
    const root = rootRef.current;
    const cv = cvRef.current;
    const ctx = ctxRef.current;
    if (!root || !cv || !ctx) return;
    const r = root.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    wRef.current = Math.round(r.width);
    hRef.current = Math.round(r.height);
    cv.width = Math.round(wRef.current * dpr);
    cv.height = Math.round(hRef.current * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cxRef.current = wRef.current / 2;
    cyRef.current = hRef.current * 0.53;
  }

  function draw(progress: number, t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const st = pinsRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !col || !st) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgb(" + col.panel.join(",") + ")";
    ctx.fillRect(0, 0, W, H);

    // 뒤편 스포트라이트 — createRadialGradient 로 완성 문장을 비춘다
    const lit = 0.5 + 0.5 * progress;
    const sx = W / 2 + Math.sin(t * 0.9) * W * 0.06;
    const sy = H * 0.53 + Math.cos(t * 0.7) * H * 0.05;
    const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(W, H) * 0.42);
    rg.addColorStop(0, "rgba(" + col.glow.join(",") + "," + (0.5 * lit).toFixed(3) + ")");
    rg.addColorStop(1, "rgba(" + col.glow.join(",") + ",0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    const full = Math.floor(progress * str);
    const n = st.pins.length;
    ctx.lineCap = "round";
    ctx.shadowBlur = 7;
    ctx.shadowColor = "rgba(" + col.thrd.join(",") + ",0.45)";
    for (let i = 0; i < full; i++) {
      if (i < n) {
        // 첫 바퀴 — 바로 옆 핀을 이어 글자 윤곽을 진하게 그린다(G 링 → S 링).
        // 글자 사이(성분이 바뀌는 한 올)만 엷고 가늘게 건너간다
        const bridge = st.pinc[i] !== st.pinc[(i + 1) % n];
        const a1 = pinPx(i), b1 = pinPx((i + 1) % n);
        ctx.strokeStyle = "rgba(" + col.thrd.join(",") + "," + (bridge ? 0.18 : 0.92) + ")";
        ctx.lineWidth = bridge ? 1.0 : 2.7;
        if (bridge) ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(b1[0], b1[1]); ctx.stroke();
        if (bridge) ctx.shadowBlur = 7;
      } else {
        // 둘째 바퀴부터 — 같은 글자 안에서만 5·9·13칸 건너뛴 올로 속을 성기게 채운다.
        // 글자를 넘는 긴 올이 없으니 실 다발이 글자 모양대로만 묶인다
        const f = i - n;
        const run = st.runs[f % st.runs.length];
        const m = run[2] - run[1];
        const c = Math.floor(f / st.runs.length);
        const K2 = [5, 9, 13][c % 3] % Math.max(2, m - 1);
        const q0 = run[1] + (c % m);
        const q1 = run[1] + ((c % m) + K2) % m;
        const a2 = pinPx(q0), b2 = pinPx(q1);
        const recency = (full - i) / str;
        const alpha = 0.22 + 0.3 * Math.pow(recency, 1.1);
        ctx.strokeStyle = "rgba(" + col.thrd.join(",") + "," + alpha.toFixed(3) + ")";
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;

    // 글자 핀 — 감기가 지나간 핀은 밝게 숨쉰다
    for (let p = 0; p < n; p++) {
      const xy = pinPx(p);
      const pulse = 0.5 + 0.5 * Math.sin(t * 4 - p * 0.3);
      ctx.fillStyle = "rgba(" + col.pin.join(",") + "," + (0.5 + 0.45 * pulse).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(xy[0], xy[1], 1.5 + 1.2 * pulse, 0, Math.PI * 2); ctx.fill();
    }
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = ((now - t0) / 1000) % cycle;
    // 0→0.8 감기 · 0.8→1 유지 — 유지 구간에도 스포트라이트·핀 맥동이 계속 움직인다
    const progress = Math.min(1, t / cycle / 0.8);
    draw(progress, t);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    colRef.current = {
      thrd: tokRGB(root, "--si-thread"),
      glow: tokRGB(root, "--si-glow"),
      pin: tokRGB(root, "--si-pin"),
      panel: tokRGB(root, "--si-panel")
    };
    ctxRef.current = cv.getContext("2d");
    pinsRef.current = buildPins();   // 글자 윤곽 핀을 미리 계산(결정적)
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(1, 0);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(1, 0);                                // reduce — 다 감긴 워드마크 한 장만 고정
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
  }, [npin, str, cycle]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div
        className={rootCls}
        ref={rootRef}
        style={vars}
        role="application"
        aria-label={BOARD_LABEL}
        tabIndex={0}
      >
        <canvas className={styles.cv} ref={cvRef}></canvas>
        <p className={styles.hint}>
          <span className={styles.title}>{HINT_TITLE}</span>
          <span className={styles.desc}>{HINT_DESC}</span>
        </p>
        <div className={styles.bar}>
          <span className={styles.meta}>{META_LEFT}</span>
          <span className={styles.metaDim}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}
