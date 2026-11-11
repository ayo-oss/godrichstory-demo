import { useEffect, useRef } from "react";
import styles from "./CopyFailRetryCountdown.module.scss";

// 실패 되돌리기 — 복사가 실패하면 버튼이 오류 빛으로 물들고, 실패 뒤 흐른 시간을 기준으로
// 농도를 원래 색까지 조금씩 보간해 저절로 되돌아간다. 되돌리기 시간은 RECOVER_MS.
// 계산 겹: 경과시간 → 보간 비율(0~1) → RGB 채널별 lerp → backgroundColor 재계산.
// 자동 시연만, 실사용자 리스너 없음. 실 클립보드 API 호출 없음 — 상태는 시뮬레이션.
const RECOVER_MS = 2400;
const HOLD_MS = 400;
const CYCLE_MS = RECOVER_MS + HOLD_MS;
const ERROR_RGB: [number, number, number] = [194, 54, 26];
const NORMAL_RGB: [number, number, number] = [10, 79, 232];

function lerp(a: number, b: number, p: number) {
  return Math.round(a + (b - a) * p);
}

export default function CopyFailRetryCountdown() {
  const btnRef = useRef<HTMLButtonElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const btn = btnRef.current;
    const hint = hintRef.current;
    if (!btn || !hint) return;

    function apply(t: number) {
      const ratio = Math.min(Math.max(t / RECOVER_MS, 0), 1);
      const r = lerp(ERROR_RGB[0], NORMAL_RGB[0], ratio);
      const g = lerp(ERROR_RGB[1], NORMAL_RGB[1], ratio);
      const b = lerp(ERROR_RGB[2], NORMAL_RGB[2], ratio);
      btn!.style.backgroundColor = `rgb(${r},${g},${b})`;
      if (ratio < 1) {
        const remain = (((1 - ratio) * RECOVER_MS) / 1000).toFixed(1);
        hint!.textContent = `전송 실패 · 되돌리는 중 ${remain}s`;
        hint!.classList.remove(styles.isOk);
      } else {
        hint!.textContent = "다시 복사할 수 있어요";
        hint!.classList.add(styles.isOk);
      }
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
      <section className={styles.panel}>
        <button ref={btnRef} className={styles.copyBtn} type="button" aria-label="코드 복사">
          <svg className={styles.icon} viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M216 40v128h-48V88H88V40Z" opacity=".2" />
              <path d="M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z" />
            </g>
          </svg>
          <span className={styles.label}>코드 복사</span>
        </button>
        <p ref={hintRef} className={styles.hint}>전송 실패 · 되돌리는 중 2.4s</p>
      </section>
    </div>
  );
}
