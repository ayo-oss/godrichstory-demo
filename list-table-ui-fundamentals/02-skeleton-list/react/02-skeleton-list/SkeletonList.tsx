// SkeletonList — vanilla 판(run/381/demo/02-skeleton-list/index.html)의 React 포트.
// 각 행이 로딩 완료 후 실제로 보여줄 글자의 캔버스 실측 폭을 재서 스켈레톤 막대 폭을
// 그 비율로 정한다 — 고정폭이 아니라 내용 길이를 미리 반영한다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./SkeletonList.module.scss";

export type SkeletonListProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const ROWS = [
  "상반기 성장 보고서 요약",
  "신규 가입자 추이 그래프",
  "이번 분기 매출 상위 상품",
  "고객 만족도 조사 결과",
  "재고 부족 임박 품목 알림",
];

export default function SkeletonList({
  duration = "220ms", // vanilla $duration: $dur-quick
  easing = "ease-out", // vanilla $easing: $ease-out
  color = "#4cd4a6", // vanilla $color: $subject-mint
}: SkeletonListProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const list = root.querySelector<HTMLUListElement>('[data-role="list"]');
    const reloadBtn = root.querySelector<HTMLButtonElement>('[data-role="reload"]');
    if (!list || !reloadBtn) return;
    const rows = Array.prototype.slice.call(list.querySelectorAll("[data-row]")) as HTMLLIElement[];

    const CYCLE_MS = 2000; // 캡처 창(2초)의 배수 — 스켈레톤/로딩완료 상태를 오가는 한 사이클
    const LOAD_POINT = 0.45; // 사이클 중 로딩 완료로 전환되는 지점
    const RESET_POINT = 0.96; // 이 지점부터 다시 스켈레톤으로
    const ENTER_STAGGER_MS = 70; // 행마다 등장 지연 간격
    const MIN_BAR_PCT = 32; // 막대 폭 하한(%)
    const TICK_MS = 50;

    // 계산 겹: 각 행이 로딩 완료 후 실제로 보여줄 글자의 캔버스 실측 폭을 재서
    // 스켈레톤 막대 폭을 그 비율로 정한다 — 고정폭이 아니라 내용 길이를 미리 반영한다.
    function measureBarWidths(): number[] {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      ctx.font = '600 13px -apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
      const widths = ROWS.map((text) => ctx.measureText(text).width);
      const maxW = Math.max.apply(null, widths);
      return widths.map((w) => {
        const pct = (w / maxW) * 100;
        return Math.max(MIN_BAR_PCT, Math.round(pct));
      });
    }

    const barPct = measureBarWidths();
    rows.forEach((row, i) => {
      const bar = row.querySelector<HTMLSpanElement>("[data-bar]");
      const content = row.querySelector<HTMLSpanElement>("[data-content]");
      if (!bar || !content) return;
      bar.style.setProperty("--bar-w", barPct[i] + "%");
      content.textContent = ROWS[i];
    });

    function setLoaded(loaded: boolean): void {
      rows.forEach((row, i) => {
        const content = row.querySelector<HTMLSpanElement>("[data-content]");
        if (!content) return;
        if (loaded) {
          row.classList.add("is-loaded");
          content.hidden = false;
          row.style.animationDelay = i * ENTER_STAGGER_MS + "ms";
        } else {
          row.classList.remove("is-loaded");
          content.hidden = true;
          row.style.animationDelay = "";
        }
      });
      list!.setAttribute("aria-busy", loaded ? "false" : "true");
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

    function onReload(): void {
      human();
      setLoaded(false);
      window.setTimeout(() => {
        setLoaded(true);
      }, 650);
    }
    reloadBtn.addEventListener("click", onReload);

    let timer: number | null = null;
    let start = 0;
    let loadedState = false;

    function tick(elapsedMs: number): void {
      const phase = (elapsedMs % CYCLE_MS) / CYCLE_MS;
      const wantLoaded = phase >= LOAD_POINT && phase < RESET_POINT;
      if (wantLoaded !== loadedState) {
        loadedState = wantLoaded;
        setLoaded(loadedState);
      }
    }

    function loop(): void {
      tick(performance.now() - start);
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      setLoaded(false);
      start = performance.now();
      timer = window.setInterval(loop, TICK_MS);
    } else {
      // reduce: 실사용 경로 적용 — 스켈레톤 스침·등장 트윈 없이 로딩 완료 상태를 바로 보여준다
      setLoaded(true);
    }

    return () => {
      reloadBtn.removeEventListener("click", onReload);
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, []);

  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div className={`${styles.skl} is-demo`} ref={rootRef} style={vars}>
        <ul className={styles.skl__list} data-role="list" aria-busy="true">
          {ROWS.map((_, i) => (
            <li className={styles.skl__row} data-row={i} key={i}>
              <span className={styles.skl__bar} data-bar />
              <span className={styles.skl__content} data-content hidden />
            </li>
          ))}
        </ul>
        <button type="button" className={styles.skl__reload} data-role="reload">
          다시 불러오기
        </button>
      </div>
    </main>
  );
}
