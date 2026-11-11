import { useEffect, useRef } from "react";
import styles from "./ColorPickerEyedropper.module.scss";

// 스포이드 — 캔버스에서 커서 위치의 실제 픽셀 값을 getImageData 로 추출해 밝기 값을
// 계산하고, 그 값에 따라 미리보기 글자색과 테두리 두께를 함께 다시 정한다.
// 브라우저 스포이드 API는 지원 범위가 좁아 쓰지 않는다 — 캔버스 픽셀 샘플링 시뮬레이션.
// 실키·실서버 요청 없음.
const CANVAS_W = 160;
const CANVAS_H = 90;
const CYCLE_MS = 2600;
const MIN_BORDER = 1;
const MAX_BORDER = 6;

const BANDS = [
  { x0: 0, x1: 40, h: 10, s: 70, l: 55 },
  { x0: 40, x1: 80, h: 150, s: 50, l: 30 },
  { x0: 80, x1: 120, h: 200, s: 60, l: 70 },
  { x0: 120, x1: 160, h: 280, s: 45, l: 45 },
];

function toHex(n: number) {
  return n.toString(16).padStart(2, "0");
}

export default function ColorPickerEyedropper() {
  const screenRef = useRef<HTMLCanvasElement>(null);
  const loupeRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const hexRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const screen = screenRef.current;
    const loupe = loupeRef.current;
    const preview = previewRef.current;
    const hexEl = hexRef.current;
    if (!screen || !loupe || !preview || !hexEl) return;
    const ctx = screen.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    BANDS.forEach((b) => {
      ctx.fillStyle = `hsl(${b.h}deg ${b.s}% ${b.l}%)`;
      ctx.fillRect(b.x0, 0, b.x1 - b.x0, CANVAS_H);
    });

    function apply(t: number) {
      const p = (t / CYCLE_MS) % 1;
      const triangle = p < .5 ? p * 2 : (1 - p) * 2;
      const x = 8 + triangle * (CANVAS_W - 16);
      const y = CANVAS_H / 2 + Math.sin(p * Math.PI * 4) * (CANVAS_H / 2 - 6);
      const xi = Math.max(0, Math.min(CANVAS_W - 1, Math.round(x)));
      const yi = Math.max(0, Math.min(CANVAS_H - 1, Math.round(y)));

      const pixel = ctx!.getImageData(xi, yi, 1, 1).data;
      const r = pixel[0], g = pixel[1], b = pixel[2];
      const hex = "#" + toHex(r) + toHex(g) + toHex(b);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      const ink = brightness > 150;
      const borderPx = MIN_BORDER + (brightness / 255) * (MAX_BORDER - MIN_BORDER);

      loupe!.style.transform = `translate(-50%, -50%) translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
      preview!.style.background = hex;
      preview!.style.borderWidth = `${borderPx.toFixed(1)}px`;
      preview!.classList.toggle(styles.isInk, ink);
      hexEl!.textContent = hex;
    }

    if (reduce) {
      apply(0);
      return;
    }

    let start: number | null = null;
    let raf = 0;
    function loop(ts: number) {
      if (start === null) start = ts;
      const t = (ts - start) % CYCLE_MS;
      apply(t);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={styles.stage}>
      <section className={styles.panel}>
        <div className={styles.screenWrap}>
          <canvas className={styles.screen} ref={screenRef} width={CANVAS_W} height={CANVAS_H} aria-hidden="true" />
          <div className={styles.loupe} ref={loupeRef} />
        </div>
        <div className={styles.preview} ref={previewRef}>
          <span className={styles.hex} ref={hexRef}>#000000</span>
        </div>
      </section>
    </div>
  );
}
