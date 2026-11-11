// StringChordDensityPhoto — vanilla 판(run/326/demo/05-string-chord-density-photo/index.html) 의 React 포트.
// 밝기를 실 밀도로 바꾸는 명암 변환. 외부 이미지 없이 오프스크린 캔버스에 프로필 실루엣
// (머리·어깨)을 절차적으로 그리고 getImageData 로 밝기를 읽는다. 감을 올 후보 둘 중
// "지나는 길이 더 어두운 쪽"을 매번 골라 걸어가면(욕심 선택) 어두운 영역에만 실이
// 쌓여 초상이 떠오른다. 스케줄은 0..1 비율 격자 위에서 미리 계산해 둔다(결정적).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StringChordDensityPhoto.module.scss";

export type StringChordDensityPhotoProps = {
  duration?: string;
  easing?: string;
  color?: string;
  n?: number;      // 원 둘레 핀 개수
  str?: number;    // 감는 실 올 수
  cycle?: number;  // 감기 완료 주기(초)
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const N     = 180;   // 원 둘레 핀 개수
const STR   = 600;   // 감는 실 올 수
const CYCLE = 2.0;   // 감기 완료 주기(초) — 설정 초(2s)와 같아 한 감기가 한 루프
const SS    = 96;    // 오프스크린 밝기 격자 크기(SS×SS)

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type XY = [number, number];
type Seg = [number, number, number];   // [시작핀, 끝핀, 길 어두움 0..1]

const BOARD_LABEL = "밝기 실밀도판";
const META_LEFT = "프로필 사진 180핀 · 실 600올 · 주기 2초";
const META_RIGHT = "getImageData · 밝기";
const HINT_TITLE = "사진 실화";
const HINT_DESC = "어두운 곳에 실을 많이 감겠다 매번 고르면 얼굴이 실로 떠오른다";

export default function StringChordDensityPhoto({
  duration = "2s",
  easing = "ease-out",
  color = "#d9c9a3",
  n = N,
  str = STR,
  cycle = CYCLE
}: StringChordDensityPhotoProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ thrd: RGB; pin: RGB; panel: RGB; dim: RGB } | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rRef = useRef(0) as Box<number>;
  const cxRef = useRef(0) as Box<number>;
  const cyRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const schedRef = useRef<Seg[] | null>(null);
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

  // ── 오프스크린 프로필 실루엣 → 밝기 격자 ──
  // 머리(원) + 목 + 어깨(둥근 사다리꼴, 판 아래까지) + 뺨 음영 + 하단 좌우 배경 칼럼 — 절차적으로만 그린다.
  function buildProfile(): Float32Array {
    const lum = new Float32Array(SS * SS);
    const oc = document.createElement("canvas");
    oc.width = SS; oc.height = SS;
    const o = oc.getContext("2d");
    if (!o) return lum;
    o.fillStyle = "#fff"; o.fillRect(0, 0, SS, SS);   // 바탕 밝게
    o.fillStyle = "#000";
    // 하단 좌우 배경 칼럼 — 사진 테두리 어둡기. 아래쪽에도 실이 감기게 하여 판이 비지 않게
    o.fillRect(0, SS * 0.80, SS * 0.20, SS * 0.20);
    o.fillRect(SS * 0.80, SS * 0.80, SS * 0.20, SS * 0.20);
    // 머리 — 중앙 위쪽 큰 원
    o.beginPath(); o.arc(SS * 0.50, SS * 0.30, SS * 0.155, 0, Math.PI * 2); o.fill();
    // 목
    o.fillRect(SS * 0.455, SS * 0.40, SS * 0.09, SS * 0.10);
    // 어깨 — 둥근 사다리꼴, 판 아래까지 이어진다
    o.beginPath();
    o.moveTo(SS * 0.16, SS * 0.94);
    o.quadraticCurveTo(SS * 0.22, SS * 0.585, SS * 0.44, SS * 0.50);
    o.lineTo(SS * 0.56, SS * 0.50);
    o.quadraticCurveTo(SS * 0.78, SS * 0.585, SS * 0.84, SS * 0.94);
    o.lineTo(SS * 0.16, SS * 0.94);
    o.closePath(); o.fill();
    // 머리카락 음영 — 위쪽 반달 더 어둡게(중첩)
    o.beginPath(); o.arc(SS * 0.50, SS * 0.325, SS * 0.158, Math.PI, Math.PI * 2); o.fill();
    // 뺨·턱 음영 — 살짝 어두운 타원 2
    o.fillStyle = "#555";
    o.beginPath(); o.ellipse(SS * 0.445, SS * 0.365, SS * 0.026, SS * 0.017, 0.3, 0, Math.PI * 2); o.fill();
    o.beginPath(); o.ellipse(SS * 0.555, SS * 0.365, SS * 0.026, SS * 0.017, -0.3, 0, Math.PI * 2); o.fill();
    const d = o.getImageData(0, 0, SS, SS).data;
    for (let i = 0; i < SS * SS; i++) {
      lum[i] = 1 - d[i * 4] / 255;   // 어두움 0..1
    }
    return lum;
  }

  // 감기 순서 — 매 올을 "남은 후보 중 길이 어두움이 큰 쪽"으로 연결하는 결정적 욕심 스케줄.
  // 계산용 고정 좌표(스케줄은 판 크기와 무관하게 0..1 비율 격자 위에서 짠다)
  function plan(): Seg[] {
    const lum = buildProfile();
    const SKIP = Math.round(n * 0.41);
    const PINU: XY[] = [];
    for (let pi = 0; pi < n; pi++) {
      const pa = Math.PI * 2 * pi / n - Math.PI / 2;
      PINU.push([0.5 + Math.cos(pa) * 0.5, 0.5 + Math.sin(pa) * 0.5]);
    }
    function pinXY0(i: number): XY {
      const u = PINU[i];
      return [u[0] * SS, u[1] * SS];
    }
    function chordDark0(a: XY, b: XY): number {
      let s = 0;
      const cnt = 7;
      for (let k = 1; k <= cnt; k++) {
        const u = k / (cnt + 1);
        const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
        const gx = Math.round(x), gy = Math.round(y);
        if (gx < 0 || gy < 0 || gx >= SS || gy >= SS) continue;
        s += lum[gy * SS + gx];
      }
      return s / cnt;
    }
    const schedule: Seg[] = [];
    const used: Record<string, number> = {};
    let pos = 0;
    for (let s = 0; s < str; s++) {
      let bestJ = -1, bestV = -1;
      const base = pinXY0(pos);
      for (let c = 1; c <= 4; c++) {
        const j = (pos + c * SKIP) % n;
        const key = pos + "-" + j;
        if (used[key]) continue;
        const v = chordDark0(base, pinXY0(j));
        if (v > bestV) { bestV = v; bestJ = j; }
      }
      if (bestJ < 0) bestJ = (pos + SKIP) % n;
      used[pos + "-" + bestJ] = 1;
      schedule.push([pos, bestJ, Math.min(1, bestV * 1.6)]);
      pos = bestJ;
    }
    return schedule;
  }

  function pinXY(i: number): XY {
    const a = Math.PI * 2 * i / n - Math.PI / 2;
    return [cxRef.current + Math.cos(a) * rRef.current, cyRef.current + Math.sin(a) * rRef.current];
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
    rRef.current = Math.min(wRef.current, hRef.current) * 0.47;
    cxRef.current = wRef.current / 2;
    cyRef.current = hRef.current / 2 + Math.min(hRef.current, wRef.current) * 0.02;
  }

  function draw(progress: number, t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const schedule = schedRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !col || !schedule) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgb(" + col.panel.join(",") + ")";
    ctx.fillRect(0, 0, W, H);

    const full = Math.floor(progress * str);
    ctx.lineCap = "round";
    ctx.shadowBlur = 4;
    for (let i = 0; i < full; i++) {
      const seg = schedule[i];
      const a = pinXY(seg[0]), b = pinXY(seg[1]);
      const dens = seg[2];                            // 이 올이 지나는 길의 어두움
      const recency = (full - i) / str;
      // 어두운 길의 올은 진하게, 밝은 길의 올은 성겁게 — 밀도가 명암이 된다
      const alpha = 0.24 + 0.62 * dens + 0.2 * Math.pow(recency, 1.4);
      ctx.strokeStyle = "rgba(" + col.thrd.join(",") + "," + Math.min(0.95, alpha).toFixed(3) + ")";
      ctx.shadowColor = "rgba(" + col.thrd.join(",") + "," + (alpha * 0.3).toFixed(3) + ")";
      ctx.lineWidth = 1.1 + dens * 1.1 + recency * 0.9;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // 핀 — 감기가 지난 핀은 밝게 숨쉰다(유지 구간에도 순차 맥동)
    const lim = full > 0 ? schedule[full - 1][1] : 0;
    for (let p = 0; p < n; p++) {
      const xy = pinXY(p);
      if (p <= lim) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 4 - p * 0.35);
        ctx.fillStyle = "rgba(" + col.pin.join(",") + "," + (0.6 + 0.35 * pulse).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(xy[0], xy[1], 1.2 + 1.0 * pulse, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = "rgb(" + col.dim.join(",") + ")";
        ctx.beginPath(); ctx.arc(xy[0], xy[1], 1, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = ((now - t0) / 1000) % cycle;
    // 0→0.8 감기 · 0.8→1 유지(다 감긴 초상을 볼 시간)
    const progress = Math.min(1, t / cycle / 0.8);
    draw(progress, t);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    colRef.current = {
      thrd: tokRGB(root, "--se-thread"),
      pin: tokRGB(root, "--se-pin"),
      panel: tokRGB(root, "--se-panel"),
      dim: tokRGB(root, "--se-dim")
    };
    ctxRef.current = cv.getContext("2d");
    schedRef.current = plan();   // 주기마다 재현할 감기 순서를 미리 계산(결정적 — 매번 같은 초상)
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(1, 0);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(1, 0);                                // reduce — 다 감긴 실 초상 한 장만 고정
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
  }, [n, str, cycle]);

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
