// KaleidoPolarTileStamp — vanilla 판(run/331/demo/04-kaleido-polar-tile-stamp/index.html) 의 React 포트.
// 커서 위치를 (반경 링, 각도 스포크) 로 양자화한다. 극좌표 격자는 균일 격자와 달리
// 중심이 촘촘하고 바깥이 성기다 — 랑골·만다라 배치의 뼈대다. 도장 하나를 찍으면
// k번째 스포크의 격자점을 반사 행렬로 N 갈래에 복제한다. 도장 간격 0.12초 —
// 시간 표기와 소스 상수가 같다. 값·수치는 vanilla 와 같다.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
// reduce 에서는 루프를 돌리지 않고 32개 격자점 전부 찍힌 한 장만 남긴다(.isStill).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./KaleidoPolarTileStamp.module.scss";

export type KaleidoPolarTileStampProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

const N = 12;                    // 스포크 수 — 격자이자 대칭 차수
const RINGS = 4;                 // 반경 링 수
const COLS = ["#4d949d", "#9d4d54", "#854d9d"]; // 청록·붉은기·보라 파스텔 짙음 — 도장 셋
const GRID = "rgba(23, 20, 26, 0.12)";           // 격자선
const HINT = "커서를 링과 스포크가 만나는 격자점으로 바꿔 스냅 도장을 찍습니다";
const ARIA_FIELD = "극좌표 도장 실험판";
const STAMP_LABEL = "도장 모양";
const SHAPES = ["꽃잎 다섯", "별 여덟", "점 세 개"];
const STAMP_ARIA = "도장 모양";
const MARKS_UNIT = "찍힌 도장";
const DRAW_TEXT = "클릭·탭으로 원하는 격자점에 찍어 보세요";

export default function KaleidoPolarTileStamp({
  duration = "2s",
  easing = "ease-out",
  color = "#17141a"
}: KaleidoPolarTileStampProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const selRef = useRef<HTMLSelectElement | null>(null);
  const marksRef = useRef<HTMLSpanElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stRef = useRef({
    W: 0, H: 0, dpr: 1, cx: 0, cy: 0, R: 0,
    count: 0, shape: 0, t: 0, fired: 0
  }) as Box<{
    W: number; H: number; dpr: number; cx: number; cy: number; R: number;
    count: number; shape: number; t: number; fired: number;
  }>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function fit(): void {
    const st = stRef.current;
    const field = fieldRef.current, cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    st.W = field.clientWidth; st.H = field.clientHeight;
    st.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(st.W * st.dpr); cv.height = Math.round(st.H * st.dpr);
    st.cx = st.W / 2; st.cy = st.H / 2; st.R = Math.min(st.W, st.H) / 2 - 8;
    ctxRef.current = ctx;
    drawGrid();
  }

  // 격자 — 링 원 N/2 개와 스포크 반직선 N 개. 찍힌 도장은 지우지 않는다
  function drawGrid(): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.clearRect(0, 0, st.W, st.H);
    ctx.strokeStyle = GRID; ctx.lineWidth = 1;
    for (let g = 1; g <= RINGS; g++) {
      const r = st.R * g / RINGS;
      ctx.beginPath(); ctx.arc(st.cx, st.cy, r, 0, 2 * Math.PI); ctx.stroke();
    }
    for (let k = 0; k < N; k++) {
      const a = k * 2 * Math.PI / N;
      ctx.beginPath(); ctx.moveTo(st.cx, st.cy);
      ctx.lineTo(st.cx + st.R * Math.cos(a), st.cy + st.R * Math.sin(a)); ctx.stroke();
    }
  }

  // 도장 모양 — 셋 다 arc·lineTo 조합. 칩과 1:1
  function drawStamp(x: number, y: number, s: number, ci: number, rot: number): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = COLS[ci % 3];
    ctx.strokeStyle = COLS[ci % 3];
    if (st.shape === 0) {
      // 꽃잎 다섯 — 원 5개가 한 점을 공유
      for (let p = 0; p < 5; p++) {
        const a = p * 2 * Math.PI / 5;
        ctx.beginPath();
        ctx.arc(s * 0.62 * Math.cos(a), s * 0.62 * Math.sin(a), s * 0.42, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else if (st.shape === 1) {
      // 별 여덟 — lineTo 로 뾰족별
      ctx.beginPath();
      for (let v = 0; v < 16; v++) {
        const rad = (v % 2 === 0) ? s : s * 0.44;
        const an = v * Math.PI / 8;
        const px = rad * Math.cos(an), py = rad * Math.sin(an);
        if (v === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    } else {
      // 점 세 개 — arc 세 개를 lineTo 로 잇는 얼룩
      ctx.beginPath();
      ctx.arc(-s * 0.55, -s * 0.2, s * 0.34, 0, 2 * Math.PI); ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.5, -s * 0.35, s * 0.28, 0, 2 * Math.PI); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, s * 0.1); ctx.lineTo(s * 0.28, s * 0.05); ctx.lineTo(s * 0.1, s * 0.62); ctx.closePath(); ctx.fill();
    }
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
  }

  // 스냅 — 극좌표를 링·스포크 번호로 반올림한 뒤 다시 좌표로
  function snap(px: number, py: number): [number, number, number, number] {
    const st = stRef.current;
    const dx = px - st.cx, dy = py - st.cy;
    const r = Math.min(RINGS, Math.max(1, Math.round(Math.hypot(dx, dy) / (st.R / RINGS))));
    let k = Math.round(Math.atan2(dy, dx) / (2 * Math.PI / N));
    k = ((k % N) + N) % N;
    const a = k * 2 * Math.PI / N;
    return [st.cx + r * (st.R / RINGS) * Math.cos(a), st.cy + r * (st.R / RINGS) * Math.sin(a), r, k];
  }

  // 격자점 하나에 도장 — 스포크 전체에 반사 복제. 링은 이미 대칭이라 r 하나만
  function stampAt(px: number, py: number, ci: number): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const p = snap(px, py);
    const aBase = p[3] * 2 * Math.PI / N;
    for (let k = 0; k < N; k++) {
      const a = k * 2 * Math.PI / N, c = Math.cos(a), s = Math.sin(a);
      ctx.setTransform(st.dpr * c, st.dpr * s, st.dpr * s, -st.dpr * c, st.cx * st.dpr, st.cy * st.dpr);
      const lx = (p[0] - st.cx), ly = (p[1] - st.cy);
      const mx = lx * c + ly * s, my = lx * s - ly * c;
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      drawStamp(st.cx + mx, st.cy + my, 9 + p[2] * 1.6, ci, aBase + k * 0.2);
    }
    st.count += 1;
    const out = marksRef.current;
    if (out) out.textContent = String(st.count);
  }

  // 시드 고정 자동 시연 — 링·스포크·모양을 순회하며 도장 찍기
  function autoStamp(i: number): void {
    const st = stRef.current;
    const ring = (i % RINGS) + 1;
    const k = Math.floor(i / RINGS) % N;
    const a = k * 2 * Math.PI / N + (ring % 2) * (Math.PI / N);
    const rr = st.R * ring / RINGS;
    stampAt(st.cx + rr * Math.cos(a), st.cy + rr * Math.sin(a), Math.floor(i / 3));
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000; lastRef.current = now;
    st.t += dt;
    const want = Math.floor(st.t / 0.12);           // 0.12초마다 도장 한 개
    while (st.fired < want) { autoStamp(st.fired); st.fired += 1; }
    if (st.fired >= RINGS * N * 3) {                // 3바퀴 그리면 새로 시작
      st.t = 0; st.fired = 0; st.count = 0; drawGrid();
    }
    rafRef.current = requestAnimationFrame(step);
  }

  function toLocal(e: PointerEvent<HTMLDivElement>): [number, number] {
    const b = e.currentTarget.getBoundingClientRect();
    return [e.clientX - b.left, e.clientY - b.top];
  }
  function onPointerDown(e: PointerEvent<HTMLDivElement>): void {
    const st = stRef.current;
    const p = toLocal(e);
    stampAt(p[0], p[1], st.count);
  }
  function onSelectChange(): void {
    const st = stRef.current;
    const sel = selRef.current;
    if (sel) st.shape = parseInt(sel.value, 10) || 0;
  }

  useEffect(() => {
    fit();
    function onResize(): void { fit(); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 32개 격자점 전부 찍힌 완성 무늬
      for (let i = 0; i < RINGS * N; i++) autoStamp(i);
      setStill(true);
    } else {
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootCls = still ? styles.kp + " " + styles.isStill : styles.kp;
  return (
    <main className={styles.stage}>
      <div className={rootCls} style={{ "--duration": duration, "--easing": easing, "--color": color } as Vars}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.row}>
          <div
            className={styles.field}
            ref={fieldRef}
            role="application"
            aria-label={ARIA_FIELD}
            tabIndex={0}
            onPointerDown={onPointerDown}
          >
            <canvas className={styles.cv} ref={cvRef}></canvas>
          </div>
          <div className={styles.side}>
            <label className={styles.lab} htmlFor="stamp">{STAMP_LABEL}</label>
            <select className={styles.sel} id="stamp" ref={selRef} aria-label={STAMP_ARIA} defaultValue="0" onChange={onSelectChange}>
              <option value="0">{SHAPES[0]}</option>
              <option value="1">{SHAPES[1]}</option>
              <option value="2">{SHAPES[2]}</option>
            </select>
            <b className={styles.num}><span ref={marksRef}>0</span></b>
            <span className={styles.unit}>{MARKS_UNIT}</span>
            <p className={styles.meta}>{DRAW_TEXT}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
