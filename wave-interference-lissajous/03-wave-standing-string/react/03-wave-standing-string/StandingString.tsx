// StandingString — vanilla 판(run/303/demo/03-wave-standing-string/index.html) 의 React 포트.
// 양 끝이 고정된 줄 위의 정상파는 sin(nπx/L) 꼴이다. 1·2·3차 하모닉을 차례로 지나가게 하고
// 마디(node) 위치에 고정 점을 찍는다. 매 프레임 lineTo 로 줄을 다시 그린다 — 계산으로 그린다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./StandingString.module.scss";

export type StandingStringProps = {
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const TITLE = "정상파 줄넘기 하모닉 데모";
const HINT = "고정된 양 끝 사이 — 하모닉이 차례로 바뀌는 줄의 정상파";
const FIELD_LABEL = "정상파 줄 진동 실험판";
const BADGE_NUM = "1";
const BADGE_UNIT = "차 하모닉";

const LOOP = 2;     // 하모닉 하나가 머무는 시간 포함 전체 사이클(초)
const SEG = 120;    // 줄을 긋는 조각 수

export default function StandingString({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  accentColor = "#b9a0ff",
}: StandingStringProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": accentColor };

  useEffect(() => {
    const root0 = rootRef.current;
    const field0 = fieldRef.current;
    const cv0 = cvRef.current;
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
    const STRING = css.getPropertyValue("--string").trim();
    const NODE = css.getPropertyValue("--node").trim();
    const RAIL = css.getPropertyValue("--rail").trim();
    const INK = css.getPropertyValue("--ink-fg").trim();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, dpr = 1, raf = 0;

    function fit() {
      const r = field.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // 지금 시각에 해당하는 하모닉 차수 — 1→2→3차를 각각 머물렀다가 다음으로 넘어간다
    function modeAt(sec: number) {
      const u = (sec % LOOP) / LOOP;         // 0..1 사이클
      let n = 1 + Math.floor(u * 3);         // 1, 2, 3차
      if (n > 3) n = 3;
      return n;
    }

    // 정상파 줄 모양 — sin(nπs) 를 s(0..1)를 따라 그린다. 진폭은 하모닉이 커질수록 줄어든다(에너지 보존 느낌)
    function drawString(sec: number) {
      const n = modeAt(sec);
      const t = ((sec % LOOP) / LOOP) * Math.PI * 2 * 3;   // 진동 시계 — 하모닉 3개를 한 사이클로
      const x0 = W * 0.08, x1 = W * 0.92;
      const mid = H * 0.5;
      const amp = (H * 0.3) / n;

      ctx.clearRect(0, 0, W, H);

      // 레일 — 줄이 얹힌 고정 지지대
      ctx.strokeStyle = RAIL;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0 - 10, mid + 0.5); ctx.lineTo(x1 + 10, mid + 0.5);
      ctx.stroke();

      // 줄 — sin(nπs)·cos(ωt). 공간 부분과 시간 부분이 곱해진 것이 정상파의 정의다
      ctx.strokeStyle = STRING;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i <= SEG; i++) {
        const s = i / SEG;
        const x = x0 + (x1 - x0) * s;
        const y = mid - Math.sin(Math.PI * n * s) * amp * Math.cos(t);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 마디(node) — sin(nπs)=0 인 지점 n−1 개. 줄이 흔들려도 절대 움직이지 않는 점이다
      ctx.fillStyle = NODE;
      for (let k = 1; k < n; k++) {
        const nx = x0 + (x1 - x0) * (k / n);
        ctx.beginPath();
        ctx.arc(nx, mid, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // 고정단 — 양 끝의 핀
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(x0, mid, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x1, mid, 5, 0, Math.PI * 2); ctx.fill();

      if (numEl && numEl.textContent !== String(n)) numEl.textContent = String(n);
    }

    function frame(now: number) {
      drawString(now / 1000);
      raf = requestAnimationFrame(frame);
    }

    function onResize() {
      fit();
      if (reduce) drawString(0.1);
    }

    fit();
    window.addEventListener("resize", onResize);
    if (reduce) {
      // reduce — 루프 없이 1차 하모닉 최대 진폭의 한 장만 그린다
      root.classList.add("is-still");
      drawString(0.1);
    } else {
      raf = requestAnimationFrame(frame);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ss} style={vars} ref={rootRef}>
        <p className={styles["ss__hint"]}>
          <svg className={styles["ss__ico"]} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
            <g fill="currentColor">
              <path d="M32 120h192a8 8 0 0 0 0-16H32a8 8 0 0 0 0 16Z" />
              <path d="M224 136H32a8 8 0 0 0 0 16h192a8 8 0 0 0 0-16Z" />
              <path d="M128 88a44 44 0 0 0-44 44a8 8 0 0 0 8 8h72a8 8 0 0 0 8-8a44 44 0 0 0-44-44Zm-26.91 36A28 28 0 0 1 128 104a28 28 0 0 1 26.91 20Z" />
              <circle cx="52" cy="60" r="12" />
              <circle cx="204" cy="60" r="12" />
            </g>
          </svg>
          <span>{HINT}</span>
        </p>
        <div className={styles["ss__field"]} role="application" aria-label={FIELD_LABEL} ref={fieldRef}>
          <canvas className={styles["ss__cv"]} ref={cvRef} aria-label={TITLE} />
          <b className={styles["ss__badge"]} aria-hidden="true">
            <span className={styles["ss__badgeNum"]} ref={numRef}>{BADGE_NUM}</span>
            <span className={styles["ss__badgeUnit"]}>{BADGE_UNIT}</span>
          </b>
        </div>
      </div>
    </main>
  );
}
