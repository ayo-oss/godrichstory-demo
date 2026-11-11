import { useEffect, useRef } from "react";
import styles from "./CopyCharCountFill.module.scss";

// 글자 수 채움 — 복사한 문장의 글자 수(preview 실측 length)를 채움 비율로 바꾸고,
// 채움이 끝나면 아이콘·숫자가 짧게 떠올랐다 정착한다(translateY 보간, 이차 감쇠).
// 계산 겹: 글자 수 실측 → 진행률 → 오프셋(--fill) 재계산. 실사용자 리스너 있음(버튼 클릭).
// 실 클립보드 API 호출 없음 — 상태는 전부 시뮬레이션.
const FILL_MS_PER_CHAR = 18;
const BOUNCE_MS = 260;
const IDLE_MS = 140;
const CYCLE_MS = 2000;
const PREVIEW_TEXT = "이 문구는 초대장 카드 아래 자동으로 채워지는 안내용 예시 텍스트입니다.";

function bounceEase(p: number) {
  if (p < 0.5) return p / 0.5;
  const q = (p - 0.5) / 0.5;
  return 1 - q * q;
}

export default function CopyCharCountFill() {
  const fillBarRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const liveRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fillBar = fillBarRef.current;
    const icon = iconRef.current;
    const count = countRef.current;
    const live = liveRef.current;
    const btn = btnRef.current;
    if (!fillBar || !icon || !count || !live || !btn) return;

    const CHAR_COUNT = PREVIEW_TEXT.trim().length;
    const FILL_MS = CHAR_COUNT * FILL_MS_PER_CHAR;

    function render(ratio: number, lift: number) {
      fillBar!.style.setProperty("--fill", ratio.toFixed(4));
      count!.textContent = String(Math.round(ratio * CHAR_COUNT));
      icon!.style.opacity = ratio >= 1 ? "1" : "0";
      const y = -lift * 6;
      const t = `translateY(${y.toFixed(2)}px)`;
      icon!.style.transform = t;
      count!.style.transform = t;
    }

    function sequence(t: number) {
      if (t < FILL_MS) {
        render(t / FILL_MS, 0);
        live!.textContent = "";
      } else if (t < FILL_MS + BOUNCE_MS) {
        render(1, bounceEase((t - FILL_MS) / BOUNCE_MS));
        live!.textContent = `${CHAR_COUNT}자 복사됨`;
      } else {
        render(1, 0);
        live!.textContent = `${CHAR_COUNT}자 복사됨`;
      }
    }

    render(0, 0);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let autoStart: number | null = null;
    let autoRaf = 0;

    function autoLoop(ts: number) {
      if (autoStart === null) autoStart = ts;
      const t = (ts - autoStart) % CYCLE_MS;
      if (t < IDLE_MS) {
        render(0, 0);
        live!.textContent = "";
      } else {
        sequence(t - IDLE_MS);
      }
      autoRaf = requestAnimationFrame(autoLoop);
    }

    if (!reduce) autoRaf = requestAnimationFrame(autoLoop);

    function onClick() {
      if (autoRaf) {
        cancelAnimationFrame(autoRaf);
        autoRaf = 0;
      }
      render(0, 0);
      let clickStart: number | null = null;
      function userLoop(ts: number) {
        if (clickStart === null) clickStart = ts;
        const t = ts - clickStart;
        sequence(t);
        if (t < FILL_MS + BOUNCE_MS + 20) requestAnimationFrame(userLoop);
      }
      requestAnimationFrame(userLoop);
    }

    btn.addEventListener("click", onClick);
    return () => {
      if (autoRaf) cancelAnimationFrame(autoRaf);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div className={styles.stage}>
      <section className={styles.panel}>
        <div className={styles.card}>
          <p className={styles.preview}>{PREVIEW_TEXT}</p>
          <button ref={btnRef} className={styles.copyBtn} type="button" aria-label="문구 복사">
            <span className={styles.fillTrack} aria-hidden="true">
              <span ref={fillBarRef} className={styles.fillBar} />
            </span>
            <span className={styles.iconSlot}>
              <svg ref={iconRef} className={styles.icon} viewBox="0 0 256 256" aria-hidden="true">
                <g fill="currentColor">
                  <path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2" />
                  <path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32" />
                </g>
              </svg>
            </span>
            <span ref={countRef} className={styles.count}>0</span>
          </button>
        </div>
        <span ref={liveRef} className={styles.sr} role="status" aria-live="polite" />
      </section>
    </div>
  );
}
