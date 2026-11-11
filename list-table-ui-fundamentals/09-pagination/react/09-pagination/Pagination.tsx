// Pagination — vanilla 판(run/381/demo/09-pagination/index.html)의 React 포트.
// 점마다 고정 간격을 가정하지 않고, 실제 렌더된 좌표(offsetLeft)를 그대로 재서
// 슬라이딩 표시자를 그 좌표로 옮긴다 — transform 이동만 쓰고 폭은 바꾸지 않는다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./Pagination.module.scss";

export type PaginationProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const PANEL_TEXTS = [
  "가벼운 안내 카드 1",
  "가벼운 안내 카드 2",
  "가벼운 안내 카드 3",
  "가벼운 안내 카드 4",
  "가벼운 안내 카드 5",
];

export default function Pagination({
  duration = "300ms", // vanilla $duration: $dur-base
  easing = "cubic-bezier(.2, .8, .2, 1)", // vanilla $easing: $ease-spring
  color = "#5b8cf8", // vanilla $color: $subject-blue-light
}: PaginationProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const panel = root.querySelector<HTMLDivElement>('[data-role="panel"]');
    const dotsWrap = root.querySelector<HTMLDivElement>('[data-role="dots"]');
    const track = root.querySelector<HTMLSpanElement>('[data-role="track"]');
    const prevBtn = root.querySelector<HTMLButtonElement>('[data-role="prev"]');
    const nextBtn = root.querySelector<HTMLButtonElement>('[data-role="next"]');
    if (!panel || !dotsWrap || !track || !prevBtn || !nextBtn) return;
    const dots = Array.prototype.slice.call(
      dotsWrap.querySelectorAll("[data-page]")
    ) as HTMLButtonElement[];
    const total = dots.length;
    let current = 0;

    const AUTO_STEP_MS = 460;

    function clamp(v: number, lo: number, hi: number): number {
      return Math.min(hi, Math.max(lo, v));
    }

    // 계산 겹: 점마다 고정 간격을 가정하지 않고, 실제 렌더된 좌표(offsetLeft)를 그대로 재서
    // 슬라이딩 표시자를 그 좌표로 옮긴다 — transform 이동만 쓰고 폭은 바꾸지 않는다.
    function measureAndMove(index: number): void {
      const dot = dots[index];
      track!.style.setProperty("--track-x", dot.offsetLeft + "px");
    }

    function goTo(index: number): void {
      index = clamp(index, 0, total - 1);
      if (index === current) return;
      current = index;
      dots.forEach((dot, i) => {
        if (i === current) {
          dot.setAttribute("aria-current", "page");
        } else {
          dot.removeAttribute("aria-current");
        }
      });
      measureAndMove(current);
      panel!.textContent = PANEL_TEXTS[current];
      prevBtn!.disabled = current === 0;
      nextBtn!.disabled = current === total - 1;
    }

    function human(): void {
      if (root!.classList.contains("is-demo")) {
        root!.classList.remove("is-demo");
        if (timer) {
          window.clearInterval(timer);
          timer = null;
        }
      }
    }

    const dotHandlers: (() => void)[] = [];
    dots.forEach((dot, i) => {
      const handler = () => {
        human();
        goTo(i);
      };
      dotHandlers.push(handler);
      dot.addEventListener("click", handler);
    });
    function onPrev(): void {
      human();
      goTo(current - 1);
    }
    function onNext(): void {
      human();
      goTo(current + 1);
    }
    prevBtn.addEventListener("click", onPrev);
    nextBtn.addEventListener("click", onNext);

    function onKeydown(e: KeyboardEvent): void {
      if (e.key === "ArrowRight") {
        human();
        goTo(current + 1);
      } else if (e.key === "ArrowLeft") {
        human();
        goTo(current - 1);
      }
    }
    dotsWrap.addEventListener("keydown", onKeydown);

    function onResize(): void {
      measureAndMove(current);
    }
    window.addEventListener("resize", onResize);

    // 초기 배치는 트랜지션 없이 — 그대로 두면 CSS 기본값(0px)에서 실측 offsetLeft 로 바뀌는
    // 자체가 트랜지션 하나를 만들어, 렌더러가 그 트랜지션을 "재생 중인 애니메이션"으로 오인해
    // 실시간 대신 결정론(시계 직접 이동) 모드로 들어간다. 그러면 setInterval 자동 넘김이 실제
    // 경과 시간을 못 받아 프레임마다 거의 안 움직인다 — 최초 1회만 트랜지션을 꺼서 막는다.
    track.style.transition = "none";
    measureAndMove(0);
    void track.offsetHeight;
    track.style.transition = "";

    let timer: number | null = null;

    function autoTick(): void {
      goTo((current + 1) % total);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      timer = window.setInterval(autoTick, AUTO_STEP_MS);
    }
    // reduce: 실사용 경로 적용 — 자동 페이지 넘김 루프를 멈춘다. 클릭·화살표 키 이동과 위치 계산은 그대로 동작

    return () => {
      dots.forEach((dot, i) => dot.removeEventListener("click", dotHandlers[i]));
      prevBtn.removeEventListener("click", onPrev);
      nextBtn.removeEventListener("click", onNext);
      dotsWrap.removeEventListener("keydown", onKeydown);
      window.removeEventListener("resize", onResize);
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, []);

  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div className={`${styles.pgn} is-demo`} ref={rootRef} style={vars}>
        <div className={styles.pgn__panel} data-role="panel" aria-live="polite">
          가벼운 안내 카드 1
        </div>
        <nav className={styles.pgn__nav} aria-label="페이지 넘김">
          <button
            type="button"
            className={styles.pgn__navBtn}
            data-role="prev"
            aria-label="이전 페이지"
            disabled
          >
            <span aria-hidden="true">‹</span>
          </button>
          <div className={styles.pgn__dots} data-role="dots">
            <span className={styles.pgn__track} data-role="track" aria-hidden="true" />
            <button
              type="button"
              className={styles.pgn__dot}
              aria-current="page"
              aria-label="1페이지로 이동"
              data-page={0}
            />
            <button
              type="button"
              className={styles.pgn__dot}
              aria-label="2페이지로 이동"
              data-page={1}
            />
            <button
              type="button"
              className={styles.pgn__dot}
              aria-label="3페이지로 이동"
              data-page={2}
            />
            <button
              type="button"
              className={styles.pgn__dot}
              aria-label="4페이지로 이동"
              data-page={3}
            />
            <button
              type="button"
              className={styles.pgn__dot}
              aria-label="5페이지로 이동"
              data-page={4}
            />
          </div>
          <button type="button" className={styles.pgn__navBtn} data-role="next" aria-label="다음 페이지">
            <span aria-hidden="true">›</span>
          </button>
        </nav>
      </div>
    </main>
  );
}
