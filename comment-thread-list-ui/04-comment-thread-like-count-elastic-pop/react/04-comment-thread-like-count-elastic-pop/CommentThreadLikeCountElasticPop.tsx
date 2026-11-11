import { useEffect, useRef } from "react";
import styles from "./CommentThreadLikeCountElasticPop.module.scss";

// 기법: 좋아요 이전 개수와 이후 개수의 차이(diff)를 계산해, 자릿수가 바뀌는 칸만 그 방향으로
// 슬라이드시켜 "굴러가는" 시각을 만든다(249→250 이면 1의 자리 9→0, 10의 자리 4→5 가 동시에
// 굴러 올림수 전파를 보여준다). 버튼·하트 아이콘의 탄성 튐 폭도 diff 크기로 계산한다.
const INITIAL_COUNT = 249;

export default function CommentThreadLikeCountElasticPop() {
  const rootRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const heartRef = useRef<SVGSVGElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const row = rowRef.current;
    const btn = btnRef.current;
    const heart = heartRef.current;
    const countWrap = countRef.current;
    const status = statusRef.current;
    if (!root || !row || !btn || !heart || !countWrap || !status) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");

    let count = INITIAL_COUNT;
    let liked = false;

    function rollDigit(col: Element, newCh: string, diff: number, animate: boolean, delayMs: number) {
      const track = col.querySelector(":scope > .lk__digitTrack");
      const cur = track?.querySelector(":scope > .lk__digit");
      if (!track || !cur) return;
      if (cur.textContent === newCh) return;
      const next = document.createElement("span");
      next.className = "lk__digit";
      next.textContent = newCh;
      next.style.transform = `translateY(${diff > 0 ? "100%" : "-100%"})`;
      track.appendChild(next);

      if (!animate || reduce) {
        cur.remove();
        next.style.transform = "translateY(0)";
        return;
      }
      const dur = 260 + Math.min(200, Math.abs(diff) * 80);
      cur.animate(
        [{ transform: "translateY(0)" }, { transform: `translateY(${diff > 0 ? "-100%" : "100%"})` }],
        { duration: dur, delay: delayMs, easing: "cubic-bezier(.3,.7,.2,1)", fill: "forwards" }
      );
      const anim = next.animate(
        [{ transform: `translateY(${diff > 0 ? "100%" : "-100%"})` }, { transform: "translateY(0)" }],
        { duration: dur, delay: delayMs, easing: "cubic-bezier(.3,.7,.2,1)", fill: "forwards" }
      );
      anim.onfinish = () => {
        if (cur.parentNode) cur.remove();
        next.style.transform = "translateY(0)";
      };
    }

    function renderCount(newCount: number, animate: boolean, delayMs: number) {
      const diff = newCount - count;
      if (diff === 0) return;
      const oldStr = String(count).padStart(3, "0");
      const newStr = String(newCount).padStart(3, "0");
      const cols = countWrap!.querySelectorAll(":scope > .lk__digitCol");
      cols.forEach((col, i) => {
        if (oldStr[i] === newStr[i]) return;
        rollDigit(col, newStr[i], diff, animate, delayMs);
      });
      count = newCount;
    }

    function pop(el: Element, diff: number, animate: boolean, delayMs: number) {
      if (!animate || reduce) return;
      const amp = 1.14 + Math.min(0.26, Math.abs(diff) * 0.04);
      el.animate(
        [
          { transform: "scale(1)" },
          { transform: `scale(${amp})` },
          { transform: "scale(0.94)" },
          { transform: "scale(1.03)" },
          { transform: "scale(1)" },
        ],
        { duration: 420, delay: delayMs, easing: "ease-out" }
      );
    }

    function rowPulse(diff: number, animate: boolean, delayMs: number) {
      // 계산: 좋아요 차이(diff)의 크기만큼 행 전체 배경이 밝아졌다 가라앉는 폭을 넓혀
      // 버튼 주변뿐 아니라 행 전체로 값을 전파한다(넓은 면적의 근거 있는 변화).
      if (!animate || reduce) return;
      const amp = Math.min(0.22, 0.1 + Math.abs(diff) * 0.04);
      row!.animate(
        [
          { backgroundColor: "rgba(255,158,187,0)" },
          { backgroundColor: `rgba(255,158,187,${amp})` },
          { backgroundColor: "rgba(255,158,187,0)" },
        ],
        { duration: 640, delay: delayMs, easing: "ease-out" }
      );
    }

    function setLiked(next: boolean, animate: boolean, delayMs: number) {
      liked = next;
      const diff = liked ? 1 : -1;
      btn!.setAttribute("aria-pressed", String(liked));
      btn!.classList.toggle("is-liked", liked);
      const nextCount = count + diff;
      status!.textContent = liked
        ? `좋아요를 눌렀습니다. 좋아요 ${nextCount}개`
        : `좋아요를 취소했습니다. 좋아요 ${nextCount}개`;
      renderCount(nextCount, animate, delayMs);
      pop(btn!, diff, animate, delayMs);
      pop(heart!, diff, animate, delayMs);
      rowPulse(diff, animate, delayMs);
    }

    const onActivate = () => { root.classList.remove("is-demo"); setLiked(!liked, true, 0); };
    btn.addEventListener("click", onActivate);
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onActivate(); }
    });

    let timer: number | undefined;
    let popTimer: number | undefined;
    if (reduce) {
      // 초기 마크업이 이미 최종 상태(249, 좋아요 전)이므로 별도 처리 없음.
    } else {
      setLiked(true, true, 220);
      popTimer = window.setTimeout(() => {
        if (root.classList.contains("is-demo")) setLiked(false, true, 0);
      }, 1100);
      timer = window.setInterval(() => {
        if (!root.classList.contains("is-demo")) return;
        setLiked(!liked, true, 0);
      }, 2200);
    }

    return () => { if (timer) window.clearInterval(timer); if (popTimer) window.clearTimeout(popTimer); };
  }, []);

  const digits = String(INITIAL_COUNT).padStart(3, "0").split("");

  return (
    <main className={styles.stage}>
      <div className={`${styles.lk} is-demo`} ref={rootRef}>
        <div className={styles.lk__row} ref={rowRef}>
          <span className={styles.lk__avatar} aria-hidden="true" />
          <div className={styles.lk__body}>
            <p className={styles.lk__meta}>
              <strong className={styles.lk__name}>민트파도</strong>
              <span className={styles.lk__time}>14분 전</span>
            </p>
            <p className={styles.lk__text}>이 방법 진짜 깔끔하네요, 바로 적용했어요.</p>
            <button type="button" className={`lk__likeBtn ${styles.lk__likeBtn}`} ref={btnRef} aria-pressed="false" aria-label="좋아요">
              <svg className={`lk__heart ${styles.lk__heart}`} ref={heartRef} viewBox="0 0 256 256" aria-hidden="true">
                <g fill="currentColor">
                  <path d="M232 102c0 66-104 122-104 122S24 168 24 102a54 54 0 0 1 54-54c22.59 0 41.94 12.31 50 32c8.06-19.69 27.41-32 50-32a54 54 0 0 1 54 54" opacity=".2" />
                  <path d="M178 40c-20.65 0-38.73 8.88-50 23.89C116.73 48.88 98.65 40 78 40a62.07 62.07 0 0 0-62 62c0 70 103.79 126.66 108.21 129a8 8 0 0 0 7.58 0C136.21 228.66 240 172 240 102a62.07 62.07 0 0 0-62-62m-50 174.8c-18.26-10.64-96-59.11-96-112.8a46.06 46.06 0 0 1 46-46c19.45 0 35.78 10.36 42.6 27a8 8 0 0 0 14.8 0c6.82-16.67 23.15-27 42.6-27a46.06 46.06 0 0 1 46 46c0 53.61-77.76 102.15-96 112.8" />
                </g>
              </svg>
              <span className={`lk__count ${styles.lk__count}`} ref={countRef} aria-hidden="true">
                {digits.map((d, i) => (
                  <span key={i} className={`lk__digitCol ${styles.lk__digitCol}`}>
                    <span className={`lk__digitTrack ${styles.lk__digitTrack}`}>
                      <span className={`lk__digit ${styles.lk__digit}`}>{d}</span>
                    </span>
                  </span>
                ))}
              </span>
            </button>
          </div>
        </div>
        <p className={styles.lk__sr} ref={statusRef} aria-live="polite" />
      </div>
    </main>
  );
}
