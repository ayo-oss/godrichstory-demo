// DragReorderGrid — vanilla 판(run/336/demo/03-drag-reorder-grid/index.html)
// 의 React 포트. 그리드 rect 와 열 수(COLS)로 포인터 x·y 를 트랙 폭·행 높이로 나눈 몫을
// 열·행 인덱스로 삼고(cellAt) 0..cols-1 · 0..rows-1 로 클램프한 뒤 row*cols+col 로 1차원
// 인덱스를 펴서 순서 배열을 스플라이스한다(applyMove). 이동한 칸은 FLIP 좌표차 역산으로
// transform 을 되돌렸다가 푼다.
import { useEffect, useRef } from "react";
import styles from "./DragReorderGrid.module.scss";

export type DragReorderGridProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "트랙 폭·행 높이로 좌표를 나눠 몫을 열·행 인덱스로 삼고, 경계는 클램프합니다";
const COLS = 3;

type CellDef = { dot: string; label: string };
const CELL_DEFS: CellDef[] = [
  { dot: "a", label: "하늘" },
  { dot: "b", label: "바다" },
  { dot: "c", label: "숲" },
  { dot: "d", label: "사막" },
  { dot: "e", label: "설원" },
  { dot: "f", label: "화산" }
];

export default function DragReorderGrid({
  duration = "240ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a"
}: DragReorderGridProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const board = boardRef.current;
    const stateEl = stateRef.current;
    if (!board || !stateEl) return;

    const order = [0, 1, 2, 3, 4, 5];
    const CELLS: HTMLElement[] = Array.prototype.slice.call(board.children);

    function cellAt(x: number, y: number): { col: number; row: number; idx: number } {
      const r = board!.getBoundingClientRect();
      const rows = Math.ceil(CELLS.length / COLS);
      let col = Math.floor((x - r.left) / (r.width / COLS));
      let row = Math.floor((y - r.top) / (r.height / rows));
      col = Math.max(0, Math.min(COLS - 1, col));
      row = Math.max(0, Math.min(rows - 1, row));
      return { col, row, idx: row * COLS + col };
    }

    function applyMove(from: number, to: number): void {
      if (from === to || to < 0 || to >= order.length) return;
      const first = CELLS.map((c) => {
        const r = c.getBoundingClientRect();
        return { x: r.left, y: r.top };
      });
      order.splice(to, 0, order.splice(from, 1)[0]);
      order.forEach((ci) => board!.appendChild(CELLS[ci]));
      CELLS.forEach((c) => {
        const r = c.getBoundingClientRect();
        const me = first[CELLS.indexOf(c)];
        const dx = me.x - r.left;
        const dy = me.y - r.top;
        if (dx !== 0 || dy !== 0) {
          c.style.transition = "none";
          c.style.transform = "translate(" + dx + "px," + dy + "px)";
          requestAnimationFrame(() => {
            c.style.transition = "transform " + duration + " " + easing;
            c.style.transform = "translate(0,0)";
          });
        }
      });
    }

    function labelAt(x: number, y: number): void {
      const c = cellAt(x, y);
      stateEl!.textContent = "col " + c.col + " · row " + c.row;
    }

    function onClick(e: MouseEvent): void {
      stop();
      const cell = (e.target as HTMLElement).closest("." + styles.cell) as HTMLElement | null;
      if (!cell) return;
      const cr = cell.getBoundingClientRect();
      labelAt(cr.left + cr.width / 2, cr.top + cr.height / 2);
      const target = cellAt(cr.left + cr.width / 2, cr.top + cr.height / 2);
      const cur = CELLS.indexOf(cell);
      applyMove(cur, target.idx);
    }
    board.addEventListener("click", onClick as EventListener);

    let playing = true;
    function stop(): void {
      playing = false;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let swapToggle = 0;
    function scenario(): void {
      const r = board!.getBoundingClientRect();
      let x2: number, y2: number;
      if (swapToggle === 0) {
        x2 = r.left + r.width * 0.9;
        y2 = r.top + r.height * 0.8;
      } else {
        x2 = r.left + r.width * 0.1;
        y2 = r.top + r.height * 0.2;
      }
      swapToggle = 1 - swapToggle;
      const t2 = cellAt(x2, y2);
      labelAt(x2, y2);
      const moving = order[0];
      applyMove(order.indexOf(moving), t2.idx);
    }

    let rafId = 0;
    if (reduce) {
      scenario();
    } else {
      let last = 0;
      const DELAY = 460;
      const tick = (now: number): void => {
        if (playing && now - last >= DELAY) {
          last = now;
          scenario();
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(rafId);
      board.removeEventListener("click", onClick as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.gr}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.board} ref={boardRef}>
          {CELL_DEFS.map((c, i) => (
            <div key={i} className={styles.cell}>
              <span className={styles.dot + " " + (styles as Record<string, string>)["dot" + c.dot.toUpperCase()]} />
              <span className={styles.lbl}>{c.label}</span>
            </div>
          ))}
        </div>
        <p className={styles.meta}>
          <b className={styles.state} ref={stateRef} style={{ color }}>col 0 · row 0</b>
          <span className={styles.unit}>→ idx 0</span>
        </p>
      </div>
    </main>
  );
}
