// ChladniSandPattern — vanilla 판(run/303/demo/04-wave-chladni-sand-pattern/index.html) 의 React 포트.
// 클라드니 모래무늬 패턴 — 진동판의 정상파 방정식 sin(nπx)·sin(mπy) − sin(mπx)·sin(nπy) 값이
// 0에 가까운(마디) 픽셀만 모래 입자로 남긴다. createImageData 로 프레임을 새로 만들고,
// Math.random 으로 입자 흩뿌림(잔떨림)을 더해 진짜 모래처럼 보이게 한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ChladniSandPattern.module.scss";

export type ChladniSandPatternProps = {
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const HINT = "진동판의 마디선을 따라 모래가 스스로 정렬됩니다";
const FIELD_LABEL = "클라드니 진동판 실험판";
const BADGE_UNIT = "모드";

const LOOP = 2;                 // 모드 전환 한 사이클(초)
const MODES: [number, number][] = [[2, 3], [3, 4], [4, 2], [5, 3]];   // (n, m) 하모닉 쌍 — 순서대로 지나간다

export default function ChladniSandPattern(props: ChladniSandPatternProps) {
  const duration = props.duration ?? 2;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const accentColor = props.accentColor ?? "#4cd4a6";

  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [modeLabel, setModeLabel] = useState<string>("3,4");

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
    const sand = css.getPropertyValue("--sand").trim();
    const glow = css.getPropertyValue("--glow").trim();
    const plate = css.getPropertyValue("--plate").trim();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, dpr = 1, raf = 0;
    let img: ImageData | null = null, buf: Uint8ClampedArray | null = null;

    function parse(c: string): [number, number, number] {
      const m = c.match(/^#([0-9a-f]{6})$/i);
      if (!m) return [255, 247, 230];
      return [
        parseInt(m[1].slice(0, 2), 16),
        parseInt(m[1].slice(2, 4), 16),
        parseInt(m[1].slice(4, 6), 16),
      ];
    }
    const sandC = parse(sand);
    const glowC = parse(glow);
    const plateC = parse(plate);

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

    // 지금 시각의 (n, m) 쌍과 그 안에서의 진행률(0..1) — 진행률로 두 모드 사이를 부드럽게 섞는다
    function modeAt(sec: number) {
      const total = MODES.length * LOOP;
      const u = (sec % total) / LOOP;
      const idx = Math.floor(u) % MODES.length;
      const next = (idx + 1) % MODES.length;
      const f = u - Math.floor(u);
      return { a: MODES[idx], b: MODES[next], f };
    }

    function chladni(x: number, y: number, n: number, m: number) {
      return Math.sin(n * Math.PI * x) * Math.sin(m * Math.PI * y) -
             Math.sin(m * Math.PI * x) * Math.sin(n * Math.PI * y);
    }

    function draw(sec: number) {
      if (!buf) return;
      const mode = modeAt(sec);
      const n = mode.a[0] + (mode.b[0] - mode.a[0]) * mode.f;
      const m = mode.a[1] + (mode.b[1] - mode.a[1]) * mode.f;

      for (let y = 0; y < H; y++) {
        const ny = y / H;
        for (let x = 0; x < W; x++) {
          const nx = x / W;
          const v = Math.abs(chladni(nx, ny, n, m));
          const i = (y * W + x) * 4;
          if (v < 0.05) {
            // 마디에 가까울수록 모래가 진하다 — Math.random 으로 알갱이 흩뿌림을 더한다
            const jitter = Math.random() * 0.35;
            const t = Math.min(1, (0.05 - v) / 0.05 + jitter);
            buf[i]     = Math.round(plateC[0] + (sandC[0] - plateC[0]) * t);
            buf[i + 1] = Math.round(plateC[1] + (sandC[1] - plateC[1]) * t);
            buf[i + 2] = Math.round(plateC[2] + (sandC[2] - plateC[2]) * t);
          } else if (v < 0.12 && Math.random() < 0.06) {
            // 마디 바깥으로 튄 낱알 몇 개 — 정적인 그림이 아니라 실제로 흩어지는 느낌을 준다
            buf[i]     = glowC[0]; buf[i + 1] = glowC[1]; buf[i + 2] = glowC[2];
          } else {
            buf[i]     = plateC[0]; buf[i + 1] = plateC[1]; buf[i + 2] = plateC[2];
          }
          buf[i + 3] = 255;
        }
      }
      ctx!.putImageData(img!, 0, 0);
      const label = Math.round(mode.a[0]) + "," + Math.round(mode.a[1]);
      setModeLabel((prev) => (prev !== label ? label : prev));
    }

    function frame(now: number) {
      draw(now / 1000);
      raf = requestAnimationFrame(frame);
    }

    function onResize() {
      fit();
      if (reduce) draw(0.2);
    }

    fit();
    window.addEventListener("resize", onResize);
    if (reduce) {
      // reduce — 루프 없이 첫 모드 한 장만 그린다(빈 화면이 아니다)
      root.classList.add("is-still");
      draw(0.2);
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
      <div ref={rootRef} className={styles.ch} style={vars}>
        <p className={styles["ch__hint"]}>
          <svg className={styles["ch__ico"]} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><circle cx="72" cy="72" r="10"/><circle cx="184" cy="72" r="10"/><circle cx="128" cy="128" r="10"/><circle cx="72" cy="184" r="10"/><circle cx="184" cy="184" r="10"/><path d="M40 128h176M128 40v176" stroke="currentColor" stroke-width="8" opacity=".35"/></g></svg>
          <span>{HINT}</span>
        </p>
        <div ref={fieldRef} className={styles["ch__field"]} role="application" aria-label={FIELD_LABEL}>
          <canvas ref={cvRef} className={styles["ch__cv"]}></canvas>
          <b className={styles["ch__badge"]} aria-hidden="true"><span className={styles["ch__badgeNum"]}>{modeLabel}</span><span className={styles["ch__badgeUnit"]}>{BADGE_UNIT}</span></b>
        </div>
      </div>
    </main>
  );
}
