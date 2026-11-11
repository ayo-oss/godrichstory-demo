// KaleidoImageFeedMirror — vanilla 판(run/331/demo/05-kaleido-image-feed-mirror/index.html) 의 React 포트.
// 원본 사진 대신 코드가 그린 비단결 무늬 캔버스(source)를 쓴다. 매 프레임 source 의
// 좁은 세로 띠(스캔라인)를 drawImage 로 잘라 반사 행렬 N 갈래로 원뿔에 감듯 붙인다.
// 띠 위치가 시간으로 흐르면 사진을 천천히 먹여 나가는 셈이다. 값·수치는 vanilla 와 같다.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
// reduce 에서는 루프를 돌리지 않고 p = 0.35 의 완성 무늬 한 장만 남긴다(.isStill).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./KaleidoImageFeedMirror.module.scss";

export type KaleidoImageFeedMirrorProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

const STAGE = "#17141a";         // 무대 잉크
const C1 = "#d3c9a6";            // 모래 파스텔 — 소스 결
const C2 = "#a6b4d3";            // 파랑빛 파스텔 — 소스 결 둘째
const C3 = "#d3a6c8";            // 연분홍 파스텔 — 소스 결 셋째
const N = 5;                     // 차수 — 조각 2N 개
const SW = 320, SH = 240;        // 소스 캔버스 크기
const HINT = "사진의 좁은 띠를 잘라 부채꼴마다 조금씩 이동해 붙입니다";
const ARIA_FIELD = "사진 먹이기 실험판";
const PARTS_UNIT = "조각 갈래 2n";
const POS_LABEL = "띠 위치";
const POS_UNIT = "%";
const DRAG_TEXT = "드래그하면 띠가 손을 따라 흐릅니다";

export default function KaleidoImageFeedMirror({
  duration = "2s",
  easing = "ease-out",
  color = "#fff7e6"
}: KaleidoImageFeedMirrorProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const posRef = useRef<HTMLSpanElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const srcRef = useRef<HTMLCanvasElement | null>(null);
  const scRef = useRef<CanvasRenderingContext2D | null>(null);
  const stRef = useRef({
    W: 0, H: 0, dpr: 1, cx: 0, cy: 0, R: 0,
    t: 0, drag: false
  }) as Box<{
    W: number; H: number; dpr: number; cx: number; cy: number; R: number;
    t: number; drag: boolean;
  }>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 소스 "사진" — 파라미터 곡선으로 짠 비단결. 시드 고정이라 항상 같은 결
  function paintSource(): void {
    const sc = scRef.current;
    if (!sc) return;
    sc.fillStyle = STAGE;
    sc.fillRect(0, 0, SW, SH);
    const cols = [C1, C2, C3];
    for (let i = 0; i < 46; i++) {
      const ph = i * 1.7;
      sc.strokeStyle = cols[i % 3];
      sc.lineWidth = 2 + (i % 5);
      sc.beginPath();
      for (let y = 0; y <= SH; y += 8) {
        const x = SW / 2 + (SW / 2 - 8) * Math.sin(y * 0.013 + ph) * Math.cos(y * 0.005 + ph * 0.5);
        if (y === 0) sc.moveTo(x, y); else sc.lineTo(x, y);
      }
      sc.stroke();
    }
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
    st.cx = st.W / 2; st.cy = st.H / 2; st.R = Math.min(st.W, st.H) / 2 - 6;
    ctxRef.current = ctx;
    render(0);
  }

  // 조각 배치 — k번째 부채꼴에 띠 하나. 띠 위치 p(0~1) 는 k 와 시간으로 조금씩 다르게
  function render(p: number): void {
    const st = stRef.current;
    const ctx = ctxRef.current, src = srcRef.current;
    if (!ctx || !src) return;
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.fillStyle = STAGE;
    ctx.fillRect(0, 0, st.W, st.H);
    const band = SW / N;                        // 부채꼴마다 맡은 띠 폭
    for (let k = 0; k < N; k++) {
      const a = k * 2 * Math.PI / N, c = Math.cos(a), s = Math.sin(a);
      // 부채꼴 뒤집기(반사) — 같은 띠를 좌우로 뒤집어 이웃과 맞물리게
      const flip = (k % 2 === 0) ? 1 : -1;
      ctx.setTransform(st.dpr * c, st.dpr * s * flip, st.dpr * s, -st.dpr * c * flip, st.cx * st.dpr, st.cy * st.dpr);
      const sx = ((p * (SW - band) + k * band * 0.13) % SW + SW) % SW;
      // 띠를 원뿔에 감듯: 세로를 반경으로 눕히고 가로를 호 방향으로 늘린다
      ctx.drawImage(src, sx, 0, band, SH, -st.R * 0.18, -st.R, st.R * 0.36, st.R * 2);
    }
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    const out = posRef.current;
    if (out) out.textContent = String(Math.round(p * 100));
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000; lastRef.current = now;
    if (!st.drag) {
      st.t += dt;
      const p = 0.5 + 0.48 * Math.sin(st.t * 0.21);   // 띠가 천천히 앞뒤로 흐른다
      render(p);
    }
    rafRef.current = requestAnimationFrame(step);
  }

  function toLocal(e: PointerEvent<HTMLDivElement>): [number, number] {
    const b = e.currentTarget.getBoundingClientRect();
    return [e.clientX - b.left, e.clientY - b.top];
  }
  function onPointerDown(e: PointerEvent<HTMLDivElement>): void {
    const st = stRef.current;
    st.drag = true;
    toLocal(e);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 캡처 실패는 무시 */ }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>): void {
    const st = stRef.current;
    if (!st.drag) return;
    const p = toLocal(e);
    render(Math.max(0, Math.min(1, p[0] / st.W)));
  }
  function onPointerUp(): void {
    const st = stRef.current;
    st.drag = false;
  }

  useEffect(() => {
    // 소스 캔버스 준비 — ref 컨테이너 없이 직접 생성
    const src = document.createElement("canvas");
    src.width = SW; src.height = SH;
    srcRef.current = src;
    scRef.current = src.getContext("2d");
    paintSource();
    fit();
    function onResize(): void { fit(); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — p = 0.35 의 완성 무늬
      render(0.35);
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

  const rootCls = still ? styles.km + " " + styles.isStill : styles.km;
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
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <canvas className={styles.cv} ref={cvRef}></canvas>
          </div>
          <div className={styles.side}>
            <b className={styles.num}>{2 * N}</b>
            <span className={styles.unit}>{PARTS_UNIT}</span>
            <p className={styles.meta}>{POS_LABEL} <b><span ref={posRef}>0</span>{POS_UNIT}</b></p>
            <p className={styles.meta}>{DRAG_TEXT}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
