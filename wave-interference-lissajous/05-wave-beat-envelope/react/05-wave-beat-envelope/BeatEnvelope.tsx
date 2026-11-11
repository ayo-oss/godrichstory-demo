// BeatEnvelope — vanilla 판(run/303/demo/05-wave-beat-envelope/index.html) 의 React 포트.
// 맥놀이 진폭 엔벨로프 — 주파수가 살짝 다른(9Hz·10Hz) 두 Math.sin 파를 더하면 맥놀이가 생긴다.
// requestAnimationFrame 루프에서 합성 파형을 그리고, strokeStyle 을 바꿔 가며 포락선(envelope)
// 곡선을 따로 그려 진폭이 주기적으로 커졌다 작아지는 것을 보여준다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./BeatEnvelope.module.scss";

export type BeatEnvelopeProps = {
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const HINT = "주파수가 살짝 다른 두 파동이 만나 커졌다 작아졌다 합니다";
const FIELD_LABEL = "맥놀이 파형 실험판";
const BADGE_TEXT = "9·10";
const BADGE_UNIT = "Hz";

const F1 = 9, F2 = 10;          // 두 파동의 주파수(Hz) — 차이 1Hz 가 맥놀이 주기를 만든다
const WINDOW = 1.2;             // 화면에 보이는 시간창(초)
const SCROLL = 0.6;             // 파형이 흘러가는 속도(초/초)

export default function BeatEnvelope(props: BeatEnvelopeProps) {
  const duration = props.duration ?? 2;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const accentColor = props.accentColor ?? "#ff9ebb";

  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);

  const vars: Vars = { "--duration": duration + "s", "--easing": easing, "--color": accentColor };

  useEffect(() => {
    const root0 = rootRef.current;
    const field0 = fieldRef.current;
    const cv0 = cvRef.current;
    if (!root0 || !field0 || !cv0) return;
    const ctx0 = cv0.getContext("2d");
    if (!ctx0) return;
    // 중첩 함수(클로저) 안에서는 가드로 좁힌 널 타입이 전달되지 않는다 — 확인된 값으로 다시 상수를 묶는다
    const root: HTMLDivElement = root0;
    const field: HTMLDivElement = field0;
    const cv: HTMLCanvasElement = cv0;
    const ctx: CanvasRenderingContext2D = ctx0;

    const css = getComputedStyle(root);
    const wave = css.getPropertyValue("--wave").trim();
    const env = css.getPropertyValue("--env").trim();
    const rail = css.getPropertyValue("--rail").trim();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, dpr = 1, raf = 0;

    function fit() {
      const r = field!.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      W = r.width; H = r.height;
      cv!.width = Math.round(W * dpr);
      cv!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(sec: number) {
      const mid = H * 0.5;
      const scale = H * 0.19;

      ctx!.clearRect(0, 0, W, H);

      ctx!.strokeStyle = rail;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(0, mid + 0.5); ctx!.lineTo(W, mid + 0.5);
      ctx!.stroke();

      const t0 = sec * SCROLL;

      // 합성 파형 — 두 사인의 합
      ctx!.strokeStyle = wave;
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const t = t0 + (x / W) * WINDOW;
        const v = Math.sin(2 * Math.PI * F1 * t) + Math.sin(2 * Math.PI * F2 * t);
        const y = mid - v * scale;
        if (x === 0) ctx!.moveTo(x, y); else ctx!.lineTo(x, y);
      }
      ctx!.stroke();

      // 포락선 — |cos(2π·Δf/2·t)|·2 가 순간 최대 진폭이다. 위·아래로 대칭해 감싸는 곡선을 그린다
      ctx!.strokeStyle = env;
      ctx!.lineWidth = 1.6;
      ctx!.setLineDash([5, 4]);
      ctx!.beginPath();
      for (let xi = 0; xi <= W; xi += 2) {
        const ti = t0 + (xi / W) * WINDOW;
        const envV = Math.abs(Math.cos(Math.PI * (F1 - F2) * ti)) * 2;
        const ye = mid - envV * scale;
        if (xi === 0) ctx!.moveTo(xi, ye); else ctx!.lineTo(xi, ye);
      }
      ctx!.stroke();
      ctx!.beginPath();
      for (let xj = 0; xj <= W; xj += 2) {
        const tj = t0 + (xj / W) * WINDOW;
        const envb = Math.abs(Math.cos(Math.PI * (F1 - F2) * tj)) * 2;
        const yeb = mid + envb * scale;
        if (xj === 0) ctx!.moveTo(xj, yeb); else ctx!.lineTo(xj, yeb);
      }
      ctx!.stroke();
      ctx!.setLineDash([]);
    }

    function frame(now: number) {
      draw(now / 1000);
      raf = requestAnimationFrame(frame);
    }

    function onResize() {
      fit();
      if (reduce) draw(0.15);
    }

    fit();
    window.addEventListener("resize", onResize);
    if (reduce) {
      // reduce — 루프 없이 한 순간의 파형·엔벨로프 한 장만 그린다(빈 화면이 아니다)
      root.classList.add("is-still");
      draw(0.15);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      root.classList.remove("is-still");
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={styles.be} style={vars}>
        <p className={styles["be__hint"]}>
          <svg className={styles["be__ico"]} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M24 128c16-64 40-64 56 0s40 64 56 0s40-64 56 0s40 64 56 0" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/></g></svg>
          <span>{HINT}</span>
        </p>
        <div ref={fieldRef} className={styles["be__field"]} role="application" aria-label={FIELD_LABEL}>
          <canvas ref={cvRef} className={styles["be__cv"]}></canvas>
          <b className={styles["be__badge"]} aria-hidden="true"><span className={styles["be__badgeNum"]}>{BADGE_TEXT}</span><span className={styles["be__badgeUnit"]}>{BADGE_UNIT}</span></b>
        </div>
      </div>
    </main>
  );
}
