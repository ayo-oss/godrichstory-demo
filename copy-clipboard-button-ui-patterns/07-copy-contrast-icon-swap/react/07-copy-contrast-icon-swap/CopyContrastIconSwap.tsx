import { useEffect, useRef } from "react";
import styles from "./CopyContrastIconSwap.module.scss";

// 대비 아이콘 전환 — 버튼이 사진/영상 배경 위에 겹칠 때, 배경색의 상대 휘도를 계산해
// 밝으면 어두운 아이콘 · 어두우면 밝은 아이콘으로 가르고 테두리 대비를 유지한다.
// 계산 겹: 배경 색상 보간(장면 전환) → RGB → 상대휘도(WCAG 근사) → 임계 비교 → 아이콘/테두리 재계산.
// 자동 시연만, 실사용자 리스너 없음. 실 클립보드 API 호출 없음 — 상태는 시뮬레이션.
const BRIGHTNESS_THRESHOLD = 0.55;
const CYCLE_MS = 2000;

const SCENES: [number, number, number][] = [
  [17, 20, 26],
  [255, 210, 63],
  [10, 79, 232],
  [255, 247, 230],
];

function lerp(a: number, b: number, p: number) {
  return a + (b - a) * p;
}

function sceneRgb(t: number): [number, number, number] {
  const span = CYCLE_MS / SCENES.length;
  const idx = Math.floor(t / span) % SCENES.length;
  const next = (idx + 1) % SCENES.length;
  const p = (t % span) / span;
  const a = SCENES[idx];
  const b = SCENES[next];
  return [
    Math.round(lerp(a[0], b[0], p)),
    Math.round(lerp(a[1], b[1], p)),
    Math.round(lerp(a[2], b[2], p)),
  ];
}

function channelLin(c: number) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb: [number, number, number]) {
  const r = channelLin(rgb[0]);
  const g = channelLin(rgb[1]);
  const b = channelLin(rgb[2]);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export default function CopyContrastIconSwap() {
  const backdropRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const backdrop = backdropRef.current;
    const hint = hintRef.current;
    if (!backdrop || !hint) return;

    function apply(t: number) {
      const rgb = sceneRgb(t);
      backdrop!.style.backgroundColor = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      const brightness = relativeLuminance(rgb);
      const isLight = brightness >= BRIGHTNESS_THRESHOLD;
      backdrop!.classList.toggle(styles.isLight, isLight);
      backdrop!.classList.toggle(styles.isDark, !isLight);
      hint!.textContent = `밝기 ${brightness.toFixed(2)} · ${isLight ? "밝은 배경" : "어두운 배경"}`;
    }

    apply(0);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

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
      <div ref={backdropRef} className={styles.backdrop}>
        <button className={styles.copyBtn} type="button" aria-label="이미지 위 복사">
          <svg className={styles.icon} viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M216 40v128h-48V88H88V40Z" opacity=".2" />
              <path d="M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z" />
            </g>
          </svg>
        </button>
        <p ref={hintRef} className={styles.hint}>밝기 0.00 · 어두운 배경</p>
      </div>
    </div>
  );
}
