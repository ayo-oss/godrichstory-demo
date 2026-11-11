// InfiniteScroll — vanilla 판(run/381/demo/01-infinite-scroll/index.html)의 React 포트.
// 센티널의 intersectionRatio 로 한 번에 붙일 행 개수(batch)를 산술로 정한다 — 고정 개수가 아니다.
// 목록·자동 스크롤·IntersectionObserver 는 vanilla 와 같은 절차형 코드로, 마운트 시 한 번만 연결한다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./InfiniteScroll.module.scss";

export type InfiniteScrollProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function InfiniteScroll({
  duration = "300ms", // vanilla $duration: $dur-base
  easing = "ease-out", // vanilla $easing: $ease-out
  color = "#5b8cf8", // vanilla $color: $subject-blue-light
}: InfiniteScrollProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const view = root.querySelector<HTMLDivElement>('[data-role="view"]');
    const track = root.querySelector<HTMLUListElement>('[data-role="track"]');
    const sentinel = root.querySelector<HTMLLIElement>('[data-role="sentinel"]');
    if (!view || !track || !sentinel) return;

    const SCROLL_APPEND_STAGGER_MS = 40; // 변형 01 대상 — 새 행 등장 사이 간격
    const MIN_BATCH = 2;
    const MAX_BATCH = 6;
    const MAX_ROWS = 40;
    const RESET_DELAY_MS = 700;
    const AUTO_STEP_PX = 6;
    const AUTO_TICK_MS = 55;
    const LOAD_COOLDOWN_MS = 260;

    let rowSeq = 0;
    let loading = false;

    function clamp(v: number, lo: number, hi: number): number {
      return Math.min(hi, Math.max(lo, v));
    }

    function addRow(delayMs: number): HTMLLIElement {
      const li = document.createElement("li");
      li.className = styles.isc__row;
      li.style.animationDelay = delayMs + "ms";
      li.textContent = "피드 항목 " + String(rowSeq + 1).padStart(2, "0");
      track!.insertBefore(li, sentinel);
      rowSeq += 1;
      return li;
    }

    function resetList(): void {
      while (track!.firstChild !== sentinel) {
        track!.removeChild(track!.firstChild as ChildNode);
      }
      rowSeq = 0;
      for (let i = 0; i < 6; i += 1) {
        addRow(0);
      }
    }
    resetList();

    // 계산 겹: 센티널이 뷰포트와 겹친 비율(intersectionRatio)이 클수록 한 번에 더 많은 행을 붙인다 —
    // 화면 끝에 살짝 걸리면 조금만, 깊이 들어오면 한 번에 크게 이어붙인다.
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !loading && rowSeq < MAX_ROWS) {
            loading = true;
            const batch = Math.round(
              MIN_BATCH + (MAX_BATCH - MIN_BATCH) * clamp(entry.intersectionRatio, 0, 1)
            );
            for (let j = 0; j < batch; j += 1) {
              addRow(j * SCROLL_APPEND_STAGGER_MS);
            }
            window.setTimeout(() => {
              loading = false;
            }, LOAD_COOLDOWN_MS);
          }
        });
      },
      { root: view, threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] }
    );
    io.observe(sentinel);

    let timer: number | null = null;
    let dir = 1;

    function human(): void {
      if (root!.classList.contains("is-demo")) {
        root!.classList.remove("is-demo");
        if (timer) {
          window.clearInterval(timer);
          timer = null;
        }
      }
    }
    view.addEventListener("wheel", human, { passive: true });
    view.addEventListener("touchstart", human, { passive: true });

    function tick(): void {
      const max = view!.scrollHeight - view!.clientHeight;
      if (view!.scrollTop >= max - 1 && dir !== 0) {
        dir = 0;
        window.setTimeout(() => {
          resetList();
          view!.scrollTop = 0;
          dir = 1;
        }, RESET_DELAY_MS);
        return;
      }
      if (dir === 0) {
        return;
      }
      view!.scrollTop = Math.min(view!.scrollTop + AUTO_STEP_PX, max);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      timer = window.setInterval(tick, AUTO_TICK_MS);
    }
    // reduce: 실사용 경로 적용 — 자동 스크롤과 등장 트윈만 멈춘다. IntersectionObserver 는 그대로 살아 있어
    // 사람이 실제로 스크롤하면 다음 배치가 애니메이션 없이 즉시 붙는다(scss 의 reduce 블록이 animation:none 처리)

    return () => {
      io.disconnect();
      if (timer) {
        window.clearInterval(timer);
      }
      view.removeEventListener("wheel", human);
      view.removeEventListener("touchstart", human);
    };
  }, []);

  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div className={`${styles.isc} is-demo`} ref={rootRef} style={vars}>
        <div className={styles.isc__view} data-role="view">
          <ul className={styles.isc__track} data-role="track">
            <li className={styles.isc__sentinel} data-role="sentinel" aria-hidden="true" />
          </ul>
        </div>
      </div>
    </main>
  );
}
