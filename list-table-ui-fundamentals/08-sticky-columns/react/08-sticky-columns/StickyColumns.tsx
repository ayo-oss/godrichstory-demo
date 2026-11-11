// StickyColumns — vanilla 판(run/381/demo/08-sticky-columns/index.html)의 React 포트.
// 가로 스크롤량(scrollLeft)을 SHADOW_RAMP_PX 로 정규화해 고정 칼럼의 그림자 알파를
// 산술로 만든다 — 스크롤이 없으면 그림자가 없고, 조금만 밀려도 곧바로 상한 근처까지 진해진다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./StickyColumns.module.scss";

export type StickyColumnsProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const ROW_LABELS = ["사과", "바나나", "체리", "포도"];
const MONTH_LABELS = ["1월", "2월", "3월", "4월", "5월", "6월"];
const ROW_VALUES = [
  [12, 15, 9, 18, 22, 14],
  [8, 11, 13, 10, 17, 9],
  [21, 19, 25, 16, 20, 23],
  [6, 9, 7, 12, 10, 8],
];

export default function StickyColumns({
  duration = "140ms", // vanilla $duration: $dur-instant
  easing = "ease-out", // vanilla $easing: $ease-out
  color = "#17141a", // vanilla $color: $stage-ink
}: StickyColumnsProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const view = root.querySelector<HTMLDivElement>('[data-role="view"]');
    if (!view) return;

    const STICKY_COL_SHADOW_ALPHA = 0.35; // 변형 대상 — 완전히 스크롤됐을 때 그림자 알파 상한
    const SHADOW_RAMP_PX = 40; // 이 픽셀만큼 스크롤되면 그림자가 상한에 도달
    const AUTO_TICK_MS = 45;
    const AUTO_STEP_PX = 5;

    function clamp(v: number, lo: number, hi: number): number {
      return Math.min(hi, Math.max(lo, v));
    }

    // 계산 겹: 가로 스크롤량(scrollLeft)을 SHADOW_RAMP_PX 로 정규화해 그림자 알파를 산술로 만든다 —
    // 스크롤이 없으면 그림자가 없고, 조금만 밀려도 곧바로 상한 근처까지 진해진다.
    function updateShadow(): void {
      const raw = clamp(view!.scrollLeft / SHADOW_RAMP_PX, 0, 1);
      const alpha = raw * STICKY_COL_SHADOW_ALPHA;
      view!.style.setProperty("--shadow-alpha", alpha.toFixed(3));
    }
    view.addEventListener("scroll", updateShadow, { passive: true });
    updateShadow();

    let timer: number | null = null;

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
    view.addEventListener("pointerdown", human, { passive: true });

    let dir = 1;
    function autoTick(): void {
      const max = view!.scrollWidth - view!.clientWidth;
      const next = clamp(view!.scrollLeft + dir * AUTO_STEP_PX, 0, max);
      view!.scrollLeft = next;
      if (next <= 0 || next >= max) {
        dir *= -1;
      }
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      timer = window.setInterval(autoTick, AUTO_TICK_MS);
    }
    // reduce: 실사용 경로 적용 — 자동 가로 스크롤 루프를 멈춘다. 사람이 스크롤하면 그림자 계산은 그대로 동작

    return () => {
      view.removeEventListener("scroll", updateShadow);
      view.removeEventListener("wheel", human);
      view.removeEventListener("touchstart", human);
      view.removeEventListener("pointerdown", human);
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, []);

  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div className={`${styles.stc} is-demo`} ref={rootRef} style={vars}>
        <div className={styles.stc__view} data-role="view">
          <table className={styles.stc__table}>
            <thead>
              <tr>
                <th className={styles.stc__frozen} scope="col">
                  품목
                </th>
                {MONTH_LABELS.map((label) => (
                  <th scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROW_LABELS.map((label, i) => (
                <tr key={label}>
                  <th className={styles.stc__frozen} scope="row">
                    {label}
                  </th>
                  {ROW_VALUES[i].map((v, j) => (
                    <td key={j}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
