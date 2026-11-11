// MoireGrating — vanilla 판(run/303/demo/07-wave-moire-grating/index.html) 의 React 포트.
// 두 줄무늬 층을 겹쳐 픽셀별 밝기를 곱해 무아레 무늬를 만든다. 움직임은 전부 캔버스 rAF 루프 안.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MoireGrating.module.scss";

export type MoireGratingProps = {
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const TITLE = "무아레 격자 간섭 데모";
const HINT_TEXT = "두 각도의 줄무늬가 겹쳐 만드는 물결 같은 무아레 무늬";
const FIELD_LABEL = "무아레 격자 실험판";
const BADGE_NUM = "7°";
const BADGE_UNIT = "각도차";

export default function MoireGrating({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  accentColor = "#b9a0ff",
}: MoireGratingProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [still, setStill] = useState(false);
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": accentColor,
  };

  useEffect(() => {
    const root0 = rootRef.current;
    const field0 = fieldRef.current;
    const cv0 = cvRef.current;
    if (!root0 || !field0 || !cv0) return;
    const ctx0 = cv0.getContext("2d", { willReadFrequently: true });
    if (!ctx0) return;
    // 중첩 함수(클로저) 안에서는 가드로 좁힌 널 타입이 전달되지 않는다 — 확인된 값으로 다시 상수를 묶는다
    const root: HTMLDivElement = root0;
    const field: HTMLDivElement = field0;
    const cv: HTMLCanvasElement = cv0;
    const ctx: CanvasRenderingContext2D = ctx0;

    const css = getComputedStyle(root);
    const lineA = css.getPropertyValue("--line-a").trim();
    const lineB = css.getPropertyValue("--line-b").trim();

    const ANGLE = 7 * Math.PI / 180; // 두 층의 각도차 — 작을수록 무늬 간격이 넓어진다
    const PITCH = 6;                 // 줄무늬 한 칸(px)
    const LOOP = 2;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, dpr = 1, raf = 0;
    let img: ImageData | null = null;
    let buf: Uint8ClampedArray | null = null;

    function parse(c: string): [number, number, number] {
      const m = c.match(/^#([0-9a-f]{6})$/i);
      if (!m) return [47, 109, 246];
      return [
        parseInt(m[1].slice(0, 2), 16),
        parseInt(m[1].slice(2, 4), 16),
        parseInt(m[1].slice(4, 6), 16),
      ];
    }
    const CA = parse(lineA), CB = parse(lineB);

    function fit() {
      const r = field!.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      W = Math.round(r.width); H = Math.round(r.height);
      cv!.width = Math.round(W * dpr);
      cv!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      img = ctx!.createImageData(W, H);
      buf = img.data;
    }

    // 줄무늬 층 하나의 밝기(0..1) — 회전된 좌표축을 따라 사인 줄무늬를 만든다
    function stripe(x: number, y: number, angle: number, phase: number) {
      const rx = x * Math.cos(angle) + y * Math.sin(angle);
      return Math.sin(rx / PITCH * Math.PI * 2 + phase) * 0.5 + 0.5;
    }

    function draw(sec: number) {
      if (!img || !buf) return;
      const b = buf;
      const phase = (sec % LOOP) / LOOP * Math.PI * 2; // 위상을 Math.sin 인자로 밀어 물결처럼 흐르게 한다
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const a = stripe(x, y, 0, phase);
          const c = stripe(x, y, ANGLE, -phase * 0.6);
          const v = a * c; // 두 층의 밝기를 곱해 겹침(무아레)을 만든다
          const i = (y * W + x) * 4;
          b[i] = Math.round(CA[0] + (CB[0] - CA[0]) * v);
          b[i + 1] = Math.round(CA[1] + (CB[1] - CA[1]) * v);
          b[i + 2] = Math.round(CA[2] + (CB[2] - CA[2]) * v);
          b[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    function frame(now: number) {
      draw(now / 1000);
      raf = requestAnimationFrame(frame);
    }

    function onResize() {
      fit();
      if (reduce) draw(0.35);
    }

    fit();
    window.addEventListener("resize", onResize);
    if (reduce) {
      // reduce — 루프 없이 위상 0.35 의 한 장만 그린다(빈 화면이 아니다)
      setStill(true);
      draw(0.35);
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
      <div
        className={`${styles.mo}${still ? ` ${styles["is-still"]}` : ""}`}
        ref={rootRef}
        style={vars}
        aria-label={TITLE}
      >
        <p className={styles["mo__hint"]}>
          <svg className={styles["mo__ico"]} viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M32 64h192v8H32zM32 96h192v8H32zM32 128h192v8H32zM32 160h192v8H32zM32 192h192v8H32z" opacity=".5" />
              <path d="M64 32l8 192h-8zM96 32l8 192h-8zM128 32l8 192h-8zM160 32l8 192h-8zM192 32l8 192h-8z" opacity=".5" />
            </g>
          </svg>
          <span>{HINT_TEXT}</span>
        </p>
        <div
          className={styles["mo__field"]}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
        >
          <canvas className={styles["mo__cv"]} ref={cvRef}></canvas>
          <b className={styles["mo__badge"]} aria-hidden="true">
            <span className={styles["mo__badgeNum"]}>{BADGE_NUM}</span>
            <span className={styles["mo__badgeUnit"]}>{BADGE_UNIT}</span>
          </b>
        </div>
      </div>
    </main>
  );
}
