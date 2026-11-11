// PhaseDiffPanel — vanilla 판(run/303/demo/08-wave-phase-diff-panel/index.html) 의 React 포트.
// 같은 주파수의 두 사인파를 X·Y 에 걸되 위상차 δ 만 다르게 하면 리사주 도형이
// δ=0 직선 → δ=π/2 원 → δ=π 반직선으로 바뀐다. 슬라이더를 만지지 않을 때는 자동 루프.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PhaseDiffPanel.module.scss";

export type PhaseDiffPanelProps = {
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

// 이벤트 타입은 로컬로만 정의 (React 전역 타입 import 금지)
type RangeEvt = { target: { value: string } };

const TITLE = "위상차 비교 패널 데모";
const HINT_TEXT = "위상차를 밀면 직선이 타원이 되고 원이 됩니다";
const FIELD_LABEL = "위상차 비교 실험판";
const CTRL_LABEL = "위상 δ";
const SLIDER_LABEL = "위상차 조절";
const BADGE_UNIT = "π rad";

export default function PhaseDiffPanel({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  accentColor = "#6ec8ff",
}: PhaseDiffPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const [still, setStill] = useState(false);
  const [sliderValue, setSliderValue] = useState("0");
  const manualRef = useRef(false);
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": accentColor,
  };

  useEffect(() => {
    const root0 = rootRef.current;
    const field0 = fieldRef.current;
    const cv0 = cvRef.current;
    const slider = sliderRef.current;
    const numEl = numRef.current;
    if (!root0 || !field0 || !cv0) return;
    const ctx0 = cv0.getContext("2d");
    if (!ctx0) return;
    // 중첩 함수(클로저) 안에서는 가드로 좁힌 널 타입이 전달되지 않는다 — 확인된 값으로 다시 상수를 묶는다
    const root: HTMLDivElement = root0;
    const field: HTMLDivElement = field0;
    const cv: HTMLCanvasElement = cv0;
    const ctx: CanvasRenderingContext2D = ctx0;

    const css = getComputedStyle(root);
    const TRACE = css.getPropertyValue("--trace").trim();
    const XW = css.getPropertyValue("--x-wave").trim();
    const YW = css.getPropertyValue("--y-wave").trim();
    const RAIL = css.getPropertyValue("--rail").trim();

    const LOOP = 2; // 자동 루프가 δ 를 0→2π 왕복하는 시간(초)

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, dpr = 1, raf = 0;
    const manual = manualRef; // 사람이 슬라이더를 잡고 있으면 자동 루프를 멈춘다

    function fit() {
      const r = field!.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      W = r.width; H = r.height;
      cv!.width = Math.round(W * dpr);
      cv!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // 화면을 세 팔로 나눈다 — 왼쪽 X 파형·오른쪽 Y 파형·가운데 리사주 도형
    function draw(delta: number, sec: number) {
      ctx.clearRect(0, 0, W, H);

      const mid = H * 0.5;
      const cxr = W * 0.5, R = Math.min(W * 0.28, H * 0.36);
      const xw0 = W * 0.04, xw1 = W * 0.30; // X 파형 영역
      const yw0 = W * 0.70, yw1 = W * 0.96; // Y 파형 영역
      const t = sec;

      // 레일
      ctx.strokeStyle = RAIL;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xw0, mid + 0.5); ctx.lineTo(xw1, mid + 0.5);
      ctx.moveTo(yw0, mid + 0.5); ctx.lineTo(yw1, mid + 0.5);
      ctx.moveTo(cxr - R - 8, mid + 0.5); ctx.lineTo(cxr + R + 8, mid + 0.5);
      ctx.moveTo(cxr, mid - R - 8); ctx.lineTo(cxr, mid + R + 8);
      ctx.stroke();

      // X 파형 — sin(ωt)
      ctx.strokeStyle = XW;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= xw1 - xw0; x += 2) {
        const ph = t * Math.PI * 2 + x / (xw1 - xw0) * Math.PI * 2;
        const y = mid - Math.sin(ph) * R * 0.8;
        if (x === 0) ctx.moveTo(xw0 + x, y); else ctx.lineTo(xw0 + x, y);
      }
      ctx.stroke();

      // Y 파형 — sin(ωt + δ)
      ctx.strokeStyle = YW;
      ctx.beginPath();
      for (let x2 = 0; x2 <= yw1 - yw0; x2 += 2) {
        const ph2 = t * Math.PI * 2 + x2 / (yw1 - yw0) * Math.PI * 2 + delta;
        const y2 = mid - Math.sin(ph2) * R * 0.8;
        if (x2 === 0) ctx.moveTo(yw0 + x2, y2); else ctx.lineTo(yw0 + x2, y2);
      }
      ctx.stroke();

      // 리사주 도형 — X=sin(ωt), Y=sin(ωt+δ). δ 가 0 이면 대각선 직선, π/2 면 원, π 면 반대 대각선
      ctx.strokeStyle = TRACE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const N = 120;
      for (let i = 0; i <= N; i++) {
        const th = i / N * Math.PI * 2;
        const px = cxr + Math.sin(th) * R;
        const py = mid - Math.sin(th + delta) * R;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // 진행 점 — 두 파형의 지금 값을 잇는 밝은 점
      const hx = cxr + Math.sin(t * Math.PI * 2) * R;
      const hy = mid - Math.sin(t * Math.PI * 2 + delta) * R;
      ctx.fillStyle = TRACE;
      ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, Math.PI * 2); ctx.fill();

      if (numEl) {
        const v = (delta / Math.PI).toFixed(2);
        if (numEl.textContent !== v) numEl.textContent = v;
      }
    }

    function frame(now: number) {
      const sec = now / 1000;
      let delta: number;
      if (manual.current) {
        delta = Number((sliderRef.current && sliderRef.current.value) || 0) / 100 * Math.PI * 2;
      } else {
        // 자동 왕복 — 0→2π 를 갔다가 되돌아온다(루프가 이어진다)
        const u = (sec % LOOP) / LOOP;
        delta = (u < 0.5 ? u * 2 : (1 - u) * 2) * Math.PI * 2;
        if (slider) slider.value = String(Math.round(delta / (Math.PI * 2) * 100));
      }
      draw(delta, sec);
      raf = requestAnimationFrame(frame);
    }

    function onInput() { manual.current = true; }
    function onPointerDown() { manual.current = true; }
    function onKeyDown() { manual.current = true; }

    function onResize() {
      fit();
      if (reduce) draw(Math.PI / 2, 0.2);
    }

    if (slider) {
      slider.addEventListener("input", onInput);
      slider.addEventListener("pointerdown", onPointerDown);
      slider.addEventListener("keydown", onKeyDown);
    }
    fit();
    window.addEventListener("resize", onResize);
    if (reduce) {
      // reduce — 루프 없이 δ=π/2 (원) 한 장만 그린다(빈 화면이 아니다)
      setStill(true);
      draw(Math.PI / 2, 0.2);
    } else {
      raf = requestAnimationFrame(frame);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      if (slider) {
        slider.removeEventListener("input", onInput);
        slider.removeEventListener("pointerdown", onPointerDown);
        slider.removeEventListener("keydown", onKeyDown);
      }
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div
        className={`${styles.pd}${still ? ` ${styles["is-still"]}` : ""}`}
        ref={rootRef}
        style={vars}
        aria-label={TITLE}
      >
        <p className={styles["pd__hint"]}>
          <svg className={styles["pd__ico"]} viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M32 192V64a8 8 0 0 1 16 0v128a8 8 0 0 1-16 0Z" opacity=".45" />
              <path d="M64 96v64a8 8 0 0 1-16 0V96a8 8 0 0 1 16 0Z" opacity=".45" />
              <path d="M208 192V64a8 8 0 0 1 16 0v128a8 8 0 0 1-16 0Z" opacity=".45" />
              <path d="M240 96v64a8 8 0 0 1-16 0V96a8 8 0 0 1 16 0Z" opacity=".45" />
              <ellipse cx="128" cy="128" rx="52" ry="36" fill="none" stroke="currentColor" stroke-width="10" />
            </g>
          </svg>
          <span>{HINT_TEXT}</span>
        </p>
        <div
          className={styles["pd__field"]}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
        >
          <canvas className={styles["pd__cv"]} ref={cvRef}></canvas>
          <b className={styles["pd__badge"]} aria-hidden="true">
            <span className={styles["pd__badgeNum"]} ref={numRef}>0.00</span>
            <span className={styles["pd__badgeUnit"]}>{BADGE_UNIT}</span>
          </b>
        </div>
        <p className={styles["pd__ctrl"]}>
          <label className={styles["pd__ctrlLabel"]} htmlFor="phase">{CTRL_LABEL}</label>
          <input
            className={styles["pd__slider"]}
            ref={sliderRef}
            id="phase"
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            step="0.5"
            aria-label={SLIDER_LABEL}
            onChange={(e: RangeEvt) => { manualRef.current = true; setSliderValue(e.target.value); }}
          />
        </p>
      </div>
    </main>
  );
}
