// FractalHeroScene — vanilla 판(run/323/demo/09-mb-fractal-hero-scene/index.html) 의 React 포트.
// 계산 화면 하나가 서비스 첫 화면이 되는 조립.
// 층 4개: ① 딥 줌 캔버스(02 의 잠수 로직 재사용 — 명치 끝 나선으로) ② 방사 비네팅(createRadialGradient,
// 매 프레임 그린다 — 정적 오버레이가 아니라 호흡에 맞춰 짙어졌다 옅어진다) ③ 타이포(kicker·title)
// ④ 호흡 표식(별점이 2초 주기로 맥동 — 들이쉬고 내쉬는 안내). 글자 숨품은 CSS 애니메이션.
// 줌 속도를 02 보다 크게 낮춰(2초에 x3) 배경이란 느낌을 만든다 — 주인공은 글자다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FractalHeroScene.module.scss";

export type FractalHeroSceneProps = {
  duration?: string;
  easing?: string;
  color?: string;
  zoom2s?: number;   // 2초 총 배율 — 변형 "잠수 속도"가 3 → 8
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const MAXIT0 = 90, MAXIT1 = 260;   // 배율 1 → 루프 끝 최대 반복
const IRES = 240;                  // 내부 계산 해상도(가로 픽셀)

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "프랙탈 히어로 씬";
const META_LEFT = "딥 줌 배경 · 비네팅 · 호흡 2초";
const META_RIGHT = "canvas · createRadialGradient · requestAnimationFrame";
const KICKER = "무한의 안쪽으로";
const TITLE_A = "INFINITE";
const TITLE_B = "DIVE";
const BREATH = "숨을 들이쉽니다";

const TX = -0.743643887037, TY = 0.13182590421;   // 명치 끝 나선

export default function FractalHeroScene({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#efeaff",
  zoom2s = 3
}: FractalHeroSceneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const ovRef = useRef<HTMLCanvasElement | null>(null);
  const octxRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef<RGB[] | null>(null);
  const setRef = useRef<RGB | null>(null);
  const inkRef = useRef<RGB | null>(null);
  const zoomRef = useRef(zoom2s) as Box<number>;
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
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

  function fit(): void {
    const hero = heroRef.current;
    const cv = cvRef.current;
    if (!hero || !cv) return;
    const r = hero.getBoundingClientRect();
    const W = Math.round(r.width), H = Math.round(r.height);
    wRef.current = W; hRef.current = H;
    cv.width = W; cv.height = H;
    ctxRef.current = cv.getContext("2d");
    const ov = document.createElement("canvas");
    ov.width = IRES;
    ov.height = Math.max(2, Math.round(IRES * H / W));
    ovRef.current = ov;
    octxRef.current = ov.getContext("2d");
  }

  function renderFractal(cx: number, cy: number, scale: number, maxit: number): HTMLCanvasElement | null {
    const octx = octxRef.current;
    const ov = ovRef.current;
    const PAL = palRef.current;
    const C_SET = setRef.current;
    if (!octx || !ov || !PAL || !C_SET) return null;
    const iw = ov.width, ih = ov.height;
    const img = octx.createImageData(iw, ih);
    const px = img.data;
    const dx = scale / iw, dy = scale / iw;
    const oy0 = cy - (ih * dy) / 2;
    let k = 0;
    for (let j = 0; j < ih; j++) {
      const ci = oy0 + j * dy;
      for (let i = 0; i < iw; i++) {
        const cr = cx - scale / 2 + i * dx;
        let zr = 0, zi = 0, n = 0;
        while (n < maxit && zr * zr + zi * zi <= 4) {
          const t = zr * zr - zi * zi + cr;
          zi = 2 * zr * zi + ci;
          zr = t; n++;
        }
        let r: number, g: number, b: number;
        if (n >= maxit) {
          r = C_SET[0]; g = C_SET[1]; b = C_SET[2];
        } else {
          const u = (n / maxit) * 4;
          const seg = u - Math.floor(u / 4) * 4;
          const a = PAL[Math.floor(seg) % 4], bb = PAL[(Math.floor(seg) + 1) % 4];
          const f = seg - Math.floor(seg);
          r = a[0] + (bb[0] - a[0]) * f;
          g = a[1] + (bb[1] - a[1]) * f;
          b = a[2] + (bb[2] - a[2]) * f;
        }
        px[k++] = r; px[k++] = g; px[k++] = b; px[k++] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    return ov;
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const C_INK = inkRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !C_INK) return;
    const k = Math.pow(zoomRef.current, t);
    const cx = -0.75 + (TX + 0.75) * t;
    const cy = TY * t;
    const maxit = Math.round(MAXIT0 + (MAXIT1 - MAXIT0) * t);
    const ov = renderFractal(cx, cy, 2.9 / k, maxit);
    if (!ov) return;
    ctx.drawImage(ov, 0, 0, W, H);
    // 방사 비네팅 — 중앙은 투명, 가장자리로 갈수록 잉크. 호흡(t 의 사인)에 맞춰 깊이가 운다
    const breath = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);      // 0~1 — 2초 한 호흡
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.18, W / 2, H / 2, Math.max(W, H) * 0.72);
    vg.addColorStop(0, "rgba(" + C_INK[0] + "," + C_INK[1] + "," + C_INK[2] + ",0)");
    vg.addColorStop(1, "rgba(" + C_INK[0] + "," + C_INK[1] + "," + C_INK[2] + "," + (0.42 + breath * 0.20).toFixed(3) + ")");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const loop = ((now - t0) / 1000) % 2.0;
    draw(loop / 2.0);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    zoomRef.current = zoom2s;
    palRef.current = ["--mb-c0", "--mb-c1", "--mb-c2", "--mb-c3", "--mb-c4"].map((nm) => tokRGB(root, nm));
    setRef.current = tokRGB(root, "--mb-set");
    inkRef.current = tokRGB(root, "--mb-ink");
    fit();
    function onResize(): void {
      fit(); draw(0.4);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(0.4);                      // reduce — 잠수 중반 한 장 고정
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
  }, [zoom2s]);

  const rootCls = still
    ? `${styles.root} ${styles.isStill}`
    : `${styles.root} ${styles.isDemo}`;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <div className={styles.hero} ref={heroRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <div className={styles.veil} aria-hidden="true"></div>
          <div className={styles.copy}>
            <p className={styles.kicker}>{KICKER}</p>
            <p className={styles.title}>{TITLE_A}<br />{TITLE_B}</p>
            <p className={styles.breath}>{BREATH}</p>
          </div>
          <span className={styles.star} aria-hidden="true"></span>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>{META_LEFT}</span>
          <span className={styles.metaDim}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}
