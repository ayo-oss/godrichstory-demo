// PolarRoseLissajous — vanilla 판(run/303/demo/06-wave-polar-rose-lissajous/index.html) 의 React 포트.
// 극좌표 로즈 리사주 — 01 번과 같은 리사주 수식(두 주파수의 사인 합)이지만
// 직교좌표 대신 각도 θ 에 주파수 비율을 넣어 Math.cos 로 반지름을 구하는 극좌표 방식이라
// 회전하는 꽃잎 모양으로 나온다. Math.sin 으로 다시 x·y 좌표로 바꿔 requestAnimationFrame 마다 찍는다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./PolarRoseLissajous.module.scss";

export type PolarRoseLissajousProps = {
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const HINT = "같은 리사주 수식이 극좌표에서는 꽃잎 모양이 됩니다";
const FIELD_LABEL = "극좌표 로즈 실험판";
const BADGE_TEXT = "5:4";
const BADGE_UNIT = "비율";

const K = 5 / 4;                // 꽃잎 개수를 정하는 주파수 비율 n/d
const LOOP = 2;                 // 곡선이 회전 한 바퀴 도는 시간(초)
const TRAIL = 0.09;

export default function PolarRoseLissajous(props: PolarRoseLissajousProps) {
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
    const petal = css.getPropertyValue("--petal").trim();
    const core = css.getPropertyValue("--core").trim();

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

    // 로즈 곡선 위 한 점 — r = cos(K·θ) 를 반지름으로, 회전(spin)을 더해 전체를 돌린다
    function petalPoint(th: number, spin: number, R: number) {
      const r = Math.cos(K * th) * R;
      const a = th + spin;
      return {
        x: W * 0.5 + Math.sin(a) * r,
        y: H * 0.5 + Math.cos(a) * r,
      };
    }

    function draw(sec: number) {
      ctx!.globalCompositeOperation = "destination-out";
      ctx!.fillStyle = "rgba(0,0,0," + TRAIL + ")";
      ctx!.fillRect(0, 0, W, H);
      ctx!.globalCompositeOperation = "source-over";

      const spin = (sec % LOOP) / LOOP * Math.PI * 2 * 0.5;
      const R = Math.min(W, H) * 0.42;
      const N = 480;                 // K 가 분수라 한 바퀴를 다 그리려면 표본이 많이 필요하다

      ctx!.strokeStyle = petal;
      ctx!.lineWidth = 1.6;
      ctx!.beginPath();
      for (let i = 0; i <= N; i++) {
        const p = petalPoint(i / N * Math.PI * 8, spin, R);
        if (i === 0) ctx!.moveTo(p.x, p.y); else ctx!.lineTo(p.x, p.y);
      }
      ctx!.stroke();

      ctx!.fillStyle = core;
      ctx!.beginPath();
      ctx!.arc(W * 0.5, H * 0.5, 4, 0, Math.PI * 2);
      ctx!.fill();
    }

    function frame(now: number) {
      draw(now / 1000);
      raf = requestAnimationFrame(frame);
    }

    function onResize() {
      fit();
      if (reduce) draw(0.4);
    }

    fit();
    window.addEventListener("resize", onResize);
    if (reduce) {
      // reduce — 루프 없이 회전 0.4의 한 장만 그린다(빈 화면이 아니다)
      root.classList.add("is-still");
      draw(0.4);
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
      <div ref={rootRef} className={styles.pr} style={vars}>
        <p className={styles["pr__hint"]}>
          <svg className={styles["pr__ico"]} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 32c-24 32-24 64 0 96c24-32 24-64 0-96Zm0 96c-32 24-64 24-96 0c32-24 64-24 96 0Zm0 0c32-24 64-24 96 0c-32 24-64 24-96 0Zm0 0c-24 32-24 64 0 96c24-32 24-64 0-96Z" opacity=".7"/><circle cx="128" cy="128" r="14"/></g></svg>
          <span>{HINT}</span>
        </p>
        <div ref={fieldRef} className={styles["pr__field"]} role="application" aria-label={FIELD_LABEL}>
          <canvas ref={cvRef} className={styles["pr__cv"]}></canvas>
          <b className={styles["pr__badge"]} aria-hidden="true"><span className={styles["pr__badgeNum"]}>{BADGE_TEXT}</span><span className={styles["pr__badgeUnit"]}>{BADGE_UNIT}</span></b>
        </div>
      </div>
    </main>
  );
}
