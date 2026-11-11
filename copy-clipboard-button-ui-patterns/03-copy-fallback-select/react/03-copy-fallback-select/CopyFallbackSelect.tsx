import { useEffect, useRef } from "react";
import styles from "./CopyFallbackSelect.module.scss";

// 폴백 선택 안내 — 빠른 복사 길이 막히면 안내 문구를 미리 범위로 선택해 두고,
// 선택 영역의 실측 폭과 안내 문구의 실측 폭을 더해 카드 너비 안에 들어가는지 계산해
// 한 줄(inline)·두 줄(stack) 레이아웃을 고른다. 확인 중에는 점 3개가 매 프레임 위상을
// 다시 계산해(사인파) 파동으로 움직이고, 전환은 CSS 트랜지션으로 이어 붙인다.
// 계산 겹: 매 프레임 사인파 위상 재계산(스피너) + Range.getBoundingClientRect 로 선택 폭
// 실측 → 안내문 폭 실측 → 합산 비교(레이아웃). 실사용자 리스너 있음(다시 시도 버튼).
// 실 클립보드 API 호출 없음 — Selection API 만 사용.
const CYCLE_MS = 2000;
const CHECK_MS = 650;
const SPIN_PERIOD_MS = 900;
const NOTICE_FIT = "이 문구가 이미 선택돼 있어요 — Ctrl+C 로 복사하세요";
const NOTICE_STACK = "문구가 선택돼 있어요\nCtrl+C 로 복사하세요";

// ambient 가 얇아 배열 ref 의 "possibly null" 을 못 좁힌다 — 로컬 Box 로 우회
type Box<T> = { current: T };

type Phase = "checking" | "fallback";

export default function CopyFallbackSelect() {
  const cardRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]) as unknown as Box<(HTMLSpanElement | null)[]>;
  const fieldRef = useRef<HTMLDivElement>(null);
  const selTextRef = useRef<HTMLSpanElement>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const status = statusRef.current;
    const field = fieldRef.current;
    const selText = selTextRef.current;
    const notice = noticeRef.current;
    const retryBtn = retryRef.current;
    if (!card || !status || !field || !selText || !notice || !retryBtn) return;

    function spin(t: number) {
      dotRefs.current.forEach((dot, i) => {
        if (!dot) return;
        const phase = (t / SPIN_PERIOD_MS + i / dotRefs.current.length) * Math.PI * 2;
        const wave = Math.abs(Math.sin(phase));
        dot.style.opacity = (0.32 + wave * 0.68).toFixed(3);
        dot.style.transform = `translateY(${(-wave * 3).toFixed(2)}px)`;
      });
    }

    function selectRangeWidth() {
      const range = document.createRange();
      range.selectNodeContents(selText!);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      return range.getBoundingClientRect().width;
    }

    function layoutFallback() {
      const rangeWidth = selectRangeWidth();
      const noticeWidth = notice!.scrollWidth;
      const containerWidth = field!.clientWidth;
      const fits = rangeWidth <= containerWidth && noticeWidth <= containerWidth;
      card!.classList.toggle(styles.stack, !fits);
      card!.classList.toggle(styles.inline, fits);
      return fits;
    }

    let phase: Phase = "checking";

    function setPhase(next: Phase) {
      phase = next;
      card!.dataset.phase = next;
      if (next === "checking") {
        status!.textContent = "빠른 복사 길 확인 중";
        notice!.style.opacity = "0";
        notice!.style.transform = "translateY(4px)";
      } else {
        status!.textContent = "빠른 복사 길이 열리지 않았어요";
        const fits = layoutFallback();
        notice!.style.opacity = "1";
        notice!.style.transform = "translateY(0)";
        notice!.textContent = fits ? NOTICE_FIT : NOTICE_STACK;
      }
    }

    setPhase("checking");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let start: number | null = null;
    let autoRaf = 0;

    function autoLoop(ts: number) {
      if (start === null) start = ts;
      const t = (ts - start) % CYCLE_MS;
      const next: Phase = t < CHECK_MS ? "checking" : "fallback";
      if (phase !== next) setPhase(next);
      if (next === "checking") spin(t);
      autoRaf = requestAnimationFrame(autoLoop);
    }

    if (!reduce) autoRaf = requestAnimationFrame(autoLoop);

    function onRetry() {
      if (autoRaf) {
        cancelAnimationFrame(autoRaf);
        autoRaf = 0;
      }
      setPhase("checking");
      let clickStart: number | null = null;
      function userSpin(ts: number) {
        if (clickStart === null) clickStart = ts;
        const t = ts - clickStart;
        if (t < CHECK_MS) {
          spin(t);
          requestAnimationFrame(userSpin);
        } else {
          setPhase("fallback");
        }
      }
      requestAnimationFrame(userSpin);
    }

    retryBtn.addEventListener("click", onRetry);
    return () => {
      if (autoRaf) cancelAnimationFrame(autoRaf);
      retryBtn.removeEventListener("click", onRetry);
    };
  }, []);

  return (
    <div className={styles.stage}>
      <section ref={cardRef} className={styles.card}>
        <div className={styles.statusRow}>
          <p ref={statusRef} className={styles.status}>빠른 복사 길 확인 중</p>
          <span className={styles.spinner} aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                ref={(el: HTMLSpanElement | null) => {
                  dotRefs.current[i] = el;
                }}
                className={styles.dot}
              />
            ))}
          </span>
        </div>
        <div ref={fieldRef} className={styles.field}>
          <span ref={selTextRef} className={styles.text}>example.com/invite/9f21c</span>
        </div>
        <p ref={noticeRef} className={styles.notice}>이 문구가 이미 선택돼 있어요 — Ctrl+C 로 복사하세요</p>
        <button ref={retryRef} className={styles.retryBtn} type="button">다시 시도</button>
      </section>
    </div>
  );
}
