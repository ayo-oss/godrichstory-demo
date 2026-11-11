import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./HeatmapCalendar.module.scss";

export type HeatmapCalendarProps = {
  year?: number;
  demo?: boolean;
  duration?: number;   // 루프 한 바퀴 ms — 칸 시차 폭이 이 값에 비례한다
  easing?: string;
  color?: string;      // 칸 색 (투명도 단계로 진하기를 낸다)
  stage?: string;      // 칸 사이 이격 실린더 색 (무대 배경색)
};

type KeyEvt = { key: string; preventDefault: () => void };
type Cell = { week: number; level: number; label: string; today: boolean };
type Pos = [number, number];
type Vars = CSSProperties & { "--color"?: string; "--stage"?: string };

const LEVEL_OPACITY = [0.14, 0.3, 0.48, 0.7, 1];

function pad(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}

export default function HeatmapCalendar({
  year = 2026,
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
  stage = "#ffd23f",
}: HeatmapCalendarProps) {
  const [demoOn, setDemoOn] = useState(demo);
  const cellRefs = useRef<(HTMLSpanElement | null)[][]>([]);
  const [cur, setCur] = useState<Pos | null>(null);

  const { rows, months, first } = useMemo(() => {
    const jan1 = new Date(year, 0, 1);
    const start = new Date(jan1);
    start.setDate(jan1.getDate() - ((jan1.getDay() + 6) % 7)); // 1월 1일이 속한 주의 월요일
    let seed = 7;
    const rnd = () => {
      seed = (seed * 48271) % 2147483647;
      return seed / 2147483647;
    };
    const now = new Date();
    const grid: (Cell | null)[][] = [];
    for (let d = 0; d < 7; d++) {
      const row: (Cell | null)[] = [];
      for (let w = 0; w < 53; w++) {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
        if (date.getFullYear() !== year) {
          row.push(null);
          continue;
        }
        let v = rnd();
        const dow = date.getDay(), m = date.getMonth();
        if (dow === 0) v *= 0.35;                                     // 일요일은 쉰다
        else if (dow === 6) v *= 0.55;
        if (m === 6 || (m === 7 && date.getDate() < 15)) v *= 0.2;   // 여름 공백
        if (m === 11) v = Math.min(1, v * 1.4 + 0.1);                // 12월 마감 몰림
        if (rnd() < 0.12) v = Math.min(1, v + 0.45);                 // 가끔 폭발
        row.push({
          week: w,
          level: v < 0.16 ? 0 : v < 0.36 ? 1 : v < 0.56 ? 2 : v < 0.76 ? 3 : 4,
          label: year + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + " · " + Math.round(v * 9),
          today: date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate(),
        });
      }
      grid.push(row);
    }
    let firstCell: Pos = [0, 2];
    for (let d = 0; d < 7; d++) {
      const w = grid[d].findIndex((c) => c !== null);
      if (w >= 0) { firstCell = [d, w]; break; }
    }
    const ticks: { m: number; col: string }[] = [];
    for (let m = 1; m <= 12; m++) {
      const w0 = Math.floor((new Date(year, m - 1, 1).getTime() - start.getTime()) / 604800000);
      const w1 = m < 12 ? Math.floor((new Date(year, m, 1).getTime() - start.getTime()) / 604800000) : 53;
      ticks.push({ m, col: (w0 + 1) + " / " + (w1 + 1) });
    }
    return { rows: grid, months: ticks, first: firstCell };
  }, [year]);

  const active: Pos = cur ?? first;

  function cellEl(d: number, w: number): HTMLSpanElement | null {
    const grid = cellRefs.current;
    if (!grid || d < 0 || d > 6 || w < 0 || w > 52) return null;
    return grid[d] ? grid[d][w] : null;
  }
  function walk(d: number, w: number, dd: number, dw: number): Pos | null {
    let nd = d + dd, nw = w + dw;
    while (nd >= 0 && nd < 7 && nw >= 0 && nw < 53) {
      if (rows[nd][nw]) return [nd, nw];
      nd += dd;
      nw += dw;
    }
    return null;
  }
  function move(d: number, w: number) {
    setDemoOn(false);
    setCur([d, w]);
    const el = cellEl(d, w);
    if (el) el.focus({ preventScroll: true });
  }
  function onKeyDown(e: KeyEvt) {
    const d = active[0], w = active[1];
    let next: Pos | null = null;
    if (e.key === "ArrowRight") next = walk(d, w, 0, 1);   // ←→ 주 단위
    else if (e.key === "ArrowLeft") next = walk(d, w, 0, -1);
    else if (e.key === "ArrowDown") next = walk(d, w, 1, 0); // ↑↓ 요일 단위
    else if (e.key === "ArrowUp") next = walk(d, w, -1, 0);
    else if (e.key === "Home") next = walk(d, 0, 0, 1);
    else if (e.key === "End") next = walk(d, 52, 0, -1);
    if (next) {
      e.preventDefault();
      move(next[0], next[1]);
    }
  }

  const vars: Vars = { "--color": color, "--stage": stage };

  return (
    <section
      className={`${styles.hm} ${demoOn ? styles.demo : ""}`}
      style={vars}
      aria-label={year + " activity heatmap"}
    >
      <div className={styles.months} aria-hidden="true">
        {months.map((t) => (
          <span key={t.m} style={{ gridColumn: t.col }}>{t.m}</span>
        ))}
      </div>
      <div className={styles.board} role="grid" aria-label={year + " activity"} onKeyDown={onKeyDown}>
        {rows.map((row, d) => (
          <div key={d} className={styles.row} role="row">
            {row.map((c, w) =>
              c ? (
                <span
                  key={w}
                  ref={(el: HTMLSpanElement | null) => {
                    const grid = cellRefs.current;
                    if (!grid) return;
                    if (!grid[d]) grid[d] = [];
                    grid[d][w] = el;
                  }}
                  className={styles.cell}
                  role="gridcell"
                  aria-label={c.label}
                  aria-current={c.today ? "date" : undefined}
                  tabIndex={active[0] === d && active[1] === w ? 0 : -1}
                  style={{
                    opacity: LEVEL_OPACITY[c.level],
                    animationDelay: ((c.week / 52) * duration * 0.35).toFixed(1) + "ms",
                    animationTimingFunction: easing,
                  }}
                  onClick={() => move(d, w)}
                />
              ) : (
                <span key={w} className={styles.blank} aria-hidden="true" />
              )
            )}
          </div>
        ))}
      </div>
      <footer className={styles.foot}>
        <span className={styles.year}>{year}</span>
        <p className={styles.legend}>
          <span>Less</span>
          {LEVEL_OPACITY.slice(1).map((o, i) => (
            <i key={i} className={styles.sw} style={{ opacity: o }} aria-hidden="true" />
          ))}
          <span>More</span>
        </p>
      </footer>
    </section>
  );
}
