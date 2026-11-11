import { useEffect, useRef } from 'react';
import styles from './ChartLoadingGridFadeOrder.module.scss';

const STEP_MS = 55;
const ROWS = 3;
const COLS = 4;
const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export default function ChartLoadingGridFadeOrder() {
  const gridRef = useRef<HTMLDivElement>(null);
  const reloadRef = useRef<HTMLButtonElement>(null);
  const skRefs = useRef<HTMLDivElement[]>([]);
  const realRefs = useRef<HTMLDivElement[]>([]);

  const cells: { row: number; col: number; v: string }[] = [];
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) { cells.push({ row: r, col: c, v: LABELS[r * COLS + c] }); }
  }

  useEffect(() => {
    const grid = gridRef.current;
    const reload = reloadRef.current;
    if (!grid || !reload) return undefined;
    const sks = skRefs.current!;
    const reals = realRefs.current!;
    if (!sks || !reals) return undefined;

    // 계산 겹: 칸의 (행+열) 대각 거리로 순서를 매긴다 — 왼쪽 위부터 대각선으로 번져 나간다
    function cellOrder(row: number, col: number) { return row + col; }

    cells.forEach((cell, i) => {
      const delay = cellOrder(cell.row, cell.col) * STEP_MS;
      sks[i].parentElement!.style.setProperty('--delay', delay + 'ms');
    });

    const timers: number[] = [];
    function human() {
      grid!.classList.remove(styles['is-demo']);
      grid!.setAttribute('aria-busy', 'true');
      cells.forEach((_cell, i) => {
        sks[i].style.transition = 'none';
        reals[i].style.transition = 'none';
        sks[i].style.opacity = '1';
        reals[i].style.opacity = '0';
        reals[i].style.transform = 'scale(.92)';
      });
      let maxOrder = 0;
      cells.forEach((cell, i) => {
        const order = cellOrder(cell.row, cell.col);
        if (order > maxOrder) { maxOrder = order; }
        const delayMs = order * STEP_MS;
        timers.push(window.setTimeout(() => {
          sks[i].style.transition = 'opacity 220ms ease-out';
          reals[i].style.transition = 'opacity 220ms ease-out, transform 220ms ease-out';
          sks[i].style.opacity = '0';
          reals[i].style.opacity = '1';
          reals[i].style.transform = 'scale(1)';
        }, 200 + delayMs));
      });
      timers.push(window.setTimeout(() => { grid!.setAttribute('aria-busy', 'false'); }, 200 + maxOrder * STEP_MS + 260));
    }

    function onClick() { human(); }
    function onKey(e: KeyboardEvent) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); human(); } }
    reload.addEventListener('click', onClick);
    reload.addEventListener('keydown', onKey);

    return () => {
      reload.removeEventListener('click', onClick);
      reload.removeEventListener('keydown', onKey);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cg + ' ' + styles['is-demo']} ref={gridRef} role="img" aria-label="분기별 지표 그리드" aria-busy="true">
        {cells.map((cell, i) => (
          <div className={styles.cgCell} data-row={cell.row} data-col={cell.col} key={i}>
            <div className={styles.cgSk} ref={(el: HTMLDivElement | null) => { if (el) skRefs.current![i] = el; }} />
            <div
              className={styles.cgReal}
              data-v={cell.v}
              ref={(el: HTMLDivElement | null) => { if (el) realRefs.current![i] = el; }}
            />
          </div>
        ))}
      </div>
      <button type="button" className={styles.cgReload} ref={reloadRef}>그리드 다시 불러오기</button>
    </main>
  );
}
