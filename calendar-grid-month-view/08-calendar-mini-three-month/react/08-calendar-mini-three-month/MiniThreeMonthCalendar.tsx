import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MiniThreeMonthCalendar.module.scss";

export type MiniThreeMonthCalendarProps = {
  year?: number;
  months?: number[];      // 0-index 월 3개 (기본 [7, 8, 9] → 8·9·10월)
  demo?: boolean;
  duration?: number;      // 참조용 — 셀 팝 길이
  easing?: string;
  color?: string;         // 선택 칸 색
  stage?: string;         // 선택 칸 위 글자색 (무대색)
};

type KeyEvt = { key: string; preventDefault: () => void };
type Cell = { month: number; day: number; time: number; iso: string; path: number; today: boolean };
type Vars = CSSProperties & { "--color"?: string; "--stage"?: string };

function pad(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}

export default function MiniThreeMonthCalendar({
  year = 2026,
  months = [7, 8, 9],
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
  stage = "#ff4d1f",
}: MiniThreeMonthCalendarProps) {
  const [demoOn, setDemoOn] = useState(demo);
  const [cur, setCur] = useState(0);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { cells, start, baseEnd } = useMemo(() => {
    const start = new Date(year, months[0], 30);       // 범위 시작 — 첫째 달 말
    const baseEnd = new Date(year, months[1], 28);     // 루프의 기본 끝 — 가운데 달 28일
    const out: Cell[] = [];
    const now = new Date();
    months.forEach((m) => {
      const total = new Date(year, m + 1, 0).getDate();
      for (let day = 1; day <= total; day++) {
        const date = new Date(year, m, day);
        const off = Math.round((date.getTime() - baseEnd.getTime()) / 86400000);
        out.push({
          month: m,
          day,
          time: date.getTime(),
          iso: year + "-" + pad(m + 1) + "-" + pad(day),
          path: off >= 1 && off <= 5 ? off : 0,        // 루프가 뻗는 다섯 칸
          today: date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate(),
        });
      }
    });
    return { cells: out, start, baseEnd };
  }, [year, months]);

  const [end, setEnd] = useState<number>(baseEnd.getTime());
  const [ann, setAnn] = useState("");

  function isoOf(t: number): string {
    const d = new Date(t);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function paint(t: number) {
    setEnd(t);
    setAnn(isoOf(start.getTime()) + " ~ " + isoOf(t));
  }
  function move(i: number) {
    setDemoOn(false);
    setCur(i);
    const refs = cellRefs.current;
    const el = refs ? refs[i] : null;
    if (el) el.focus({ preventScroll: true });
    setAnn(cells[i].iso);
  }
  function onKeyDown(e: KeyEvt) {
    let n: number | null = null;
    if (e.key === "ArrowRight") n = Math.min(cur + 1, cells.length - 1);
    else if (e.key === "ArrowLeft") n = Math.max(cur - 1, 0);
    else if (e.key === "ArrowDown") n = Math.min(cur + 7, cells.length - 1);   // ±7일 — 달 경계를 넘는다
    else if (e.key === "ArrowUp") n = Math.max(cur - 7, 0);
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = cells.length - 1;
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      paint(cells[cur].time);
      return;
    }
    if (n !== null && n !== cur) {
      e.preventDefault();
      move(n);
    }
  }

  const vars: Vars = {
    "--color": color,
    "--stage": stage,
    "--duration": duration + "ms",
    "--easing": easing,
  };

  // 달 경계를 넘는 주(月) 배열 — 카드 안 배치용 (lead 빈칸 포함 6주 고정)
  const layout = useMemo(() => {
    return months.map((m) => {
      const lead = new Date(year, m, 1).getDay();
      const total = new Date(year, m + 1, 0).getDate();
      const slots: (Cell | null)[] = [];
      for (let i = 0; i < 42; i++) {
        const day = i - lead + 1;
        slots.push(day >= 1 && day <= total ? cells.find((c) => c.month === m && c.day === day) ?? null : null);
      }
      return { m, slots };
    });
  }, [months, year, cells]);

  let flat = 0; // 카드 안 칸 → 시간순 인덱스
  const placed: Record<string, number> = {};
  layout.forEach((card) => {
    card.slots.forEach((c) => {
      if (c) placed[c.month + "-" + c.day] = flat++;
    });
  });

  return (
    <section className={`${styles.m3} ${demoOn ? styles.demo : ""}`} style={vars} aria-label="Three-month calendar">
      <div className={styles.strip} onKeyDown={onKeyDown}>
        {layout.map((card, mi) => (
          <div key={card.m} className={mi === 1 ? styles.cardMid : styles.cardSide}>
            <span className={styles.label}>{year}.{card.m + 1}</span>
            <div className={styles.grid} role="grid" aria-label={year + "." + (card.m + 1)}>
              {[0, 1, 2, 3, 4, 5].map((r) => (
                <div key={r} className={styles.row} role="row">
                  {[0, 1, 2, 3, 4, 5, 6].map((c) => {
                    const cell = card.slots[r * 7 + c];
                    if (!cell) return <div key={c} className={styles.blank} aria-hidden="true" />;
                    const idx = placed[cell.month + "-" + cell.day];
                    const on = cell.time >= start.getTime() && cell.time <= end;
                    return (
                      <div
                        key={c}
                        ref={(el: HTMLDivElement | null) => { if (cellRefs.current) cellRefs.current[idx] = el; }}
                        className={styles.cell}
                        role="gridcell"
                        aria-label={cell.iso}
                        aria-selected={on}
                        aria-current={cell.today ? "date" : undefined}
                        tabIndex={cur === idx ? 0 : -1}
                        onClick={() => { move(idx); paint(cell.time); }}
                      >
                        <span className={styles.num}>{cell.day}</span>
                        <span
                          className={`${styles.sel} ${cell.path ? styles["p" + cell.path] : ""} ${on ? styles.selOn : ""}`}
                          aria-hidden="true"
                        >
                          {cell.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <span className={styles.live} role="status">{ann}</span>
    </section>
  );
}
