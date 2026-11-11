import { useEffect, useRef } from "react";
import styles from "./ConsentCheckbox.module.scss";

// 동의 체크박스(09, 아이디어형) — 약관 패널의 실제 scroll 이벤트로 진행률(progress)을 구해
// 기준(SCROLL_THRESHOLD)을 넘으면 체크박스를 활성화한다. 자동 재생 루프는 panel.scrollTop 을
// 매 프레임 직접 대입할 뿐이고, 그 대입이 브라우저의 진짜 scroll 이벤트를 발생시키므로
// 실사용자 스크롤과 이 onScroll 하나의 경로를 그대로 통과한다 — 별도 분기 없음.
// 실키·실서버 요청 없음.
const SCROLL_THRESHOLD = 0.7; // 변형: .7 → 1
const RAMP_MS = 1500;
const CYCLE_MS = 2000;
const LOCKED_TEXT = "약관을 끝까지 확인해야 동의할 수 있습니다.";
const DONE_TEXT = "약관을 끝까지 확인했습니다.";
const PLACEHOLDER_PARAGRAPHS = [0, 1, 2, 3, 4, 5, 6, 7];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function ConsentCheckbox() {
  const panelRef = useRef<HTMLDivElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);
  const labelRef = useRef<HTMLLabelElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const checkbox = checkboxRef.current;
    const label = labelRef.current;
    if (!panel || !checkbox || !label) return;

    let unlocked = false;

    function onScroll() {
      const maxScroll = panel!.scrollHeight - panel!.clientHeight;
      const progress = maxScroll > 0 ? clamp(panel!.scrollTop / maxScroll, 0, 1) : 1;
      if (progress >= SCROLL_THRESHOLD && !unlocked) {
        unlocked = true;
        checkbox!.disabled = false;
        checkbox!.setAttribute("aria-disabled", "false");
        label!.textContent = DONE_TEXT;
      } else if (progress < SCROLL_THRESHOLD && unlocked) {
        unlocked = false;
        checkbox!.disabled = true;
        checkbox!.checked = false;
        checkbox!.setAttribute("aria-disabled", "true");
        label!.textContent = LOCKED_TEXT;
      }
    }
    panel.addEventListener("scroll", onScroll);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      panel.scrollTop = panel.scrollHeight;
      onScroll();
      return () => panel.removeEventListener("scroll", onScroll);
    }

    let start: number | null = null;
    let raf = 0;
    function loop(ts: number) {
      if (start === null) start = ts;
      const t = (ts - start) % CYCLE_MS;
      const maxScroll = panel!.scrollHeight - panel!.clientHeight;
      panel!.scrollTop = maxScroll * clamp(t / RAMP_MS, 0, 1);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      panel.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.wrap}>
        <p className={styles.eyebrow}>약관 동의</p>
        <div className={styles.panel} ref={panelRef} role="region" aria-label="약관 내용" tabIndex={0}>
          {PLACEHOLDER_PARAGRAPHS.map((i) => (
            <p key={i}>이 자리 표시 문단은 실제 약관이 아닙니다.</p>
          ))}
        </div>
        <div className={styles.consentRow}>
          <input
            type="checkbox"
            id="consent"
            className={styles.checkbox}
            ref={checkboxRef}
            disabled
            aria-disabled="true"
            readOnly
          />
          <label htmlFor="consent" ref={labelRef} className={styles.label}>
            {LOCKED_TEXT}
          </label>
        </div>
      </section>
    </main>
  );
}
