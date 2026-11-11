// CaseStoryGrid — vanilla 판(run/340/demo/02-case-story-grid/index.html) 의 React 포트.
// 사례별 성과 수치를 이번 데이터셋의 최댓값과 비교해 정규화하고 IMPACT_WEIGHT 거듭제곱으로
// 임팩트 점수를 구해, 점수 구간마다 grid-column/grid-row span·패딩·숫자 크기를 다시 정한다.
import { useEffect, useRef } from "react";
import styles from "./CaseStoryGrid.module.scss";

export type CaseStoryGridProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "사례마다 적어 둔 성과 수치를 서로 비교해 임팩트 점수를 직접 구하고 그 점수로 타일 크기를 다시 정합니다";
const NAMES = ["노바", "아틀라스", "코발트", "실버라인", "테라"];
const IMPACT_WEIGHT = 1;
const DATASETS: number[][] = [
  [82, 45, 63, 21, 38],
  [30, 71, 55, 90, 24]
];

type Tier = { col: number; row: number; pad: string; font: string };

function tierFor(weighted: number): Tier {
  if (weighted >= 0.75) return { col: 2, row: 2, pad: "p3", font: "f3" };
  if (weighted >= 0.5) return { col: 2, row: 1, pad: "p2", font: "f2" };
  if (weighted >= 0.28) return { col: 1, row: 1, pad: "p1", font: "f1" };
  return { col: 1, row: 1, pad: "p0", font: "f0" };
}

export default function CaseStoryGrid({
  duration = "220ms",
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6"
}: CaseStoryGridProps) {
  const tileRefs = useRef<(HTMLElement | null)[]>([]);
  const valRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function apply(values: number[]): void {
      const max = Math.max.apply(null, values);
      values.forEach((value, i) => {
        const tile = tileRefs.current![i];
        const valEl = valRefs.current![i];
        if (!tile) return;
        const normalized = max > 0 ? value / max : 0;
        const weighted = Math.pow(normalized, IMPACT_WEIGHT);
        const tier = tierFor(weighted);
        tile.style.gridColumn = "span " + tier.col;
        tile.style.gridRow = "span " + tier.row;
        tile.dataset.pad = tier.pad;
        tile.dataset.font = tier.font;
        if (valEl) valEl.textContent = String(value);
        if (!reduce) {
          tile.classList.remove(styles.tilePulse);
          void tile.offsetWidth;
          tile.classList.add(styles.tilePulse);
        }
      });
    }

    let idx = 0;
    apply(DATASETS[0]);
    let timer = 0;
    if (!reduce) {
      timer = window.setInterval(() => {
        idx = (idx + 1) % DATASETS.length;
        apply(DATASETS[idx]);
      }, 600);
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.panel}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.grid}>
          {NAMES.map((name, i) => (
            <article
              key={name}
              className={styles.tile}
              ref={(el: HTMLElement | null) => {
                tileRefs.current![i] = el;
              }}
            >
              <p className={styles.tileName}>{name}</p>
              <p className={styles.tileNum}>
                <span
                  className={styles.tileVal}
                  ref={(el: HTMLSpanElement | null) => {
                    valRefs.current![i] = el;
                  }}
                >
                  0
                </span>
                <span className={styles.tileUnit}>%</span>
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
