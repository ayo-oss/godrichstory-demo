import { useEffect, useRef } from 'react';
import styles from './ChartLoadingHeatmapDiagonalReveal.module.scss';

const COLS = 4;
const ROWS = 4;
const WAVE_SPEED = 6; // 칸 단위 / 초 — 값이 클수록 파동이 격자를 빨리 훑는다
const VALUES = [
  12, 38, 61, 90,
  27, 55, 82, 34,
  70, 20, 46, 65,
  88, 63, 18, 41
];

const BUCKET_CLASS = [styles.chRealB0, styles.chRealB1, styles.chRealB2, styles.chRealB3];

function bucket(v: number) { return Math.min(3, Math.floor(v / 25)); }

export default function ChartLoadingHeatmapDiagonalReveal() {
  const gridRef = useRef<HTMLDivElement>(null);
  const reloadRef = useRef<HTMLButtonElement>(null);
  const skRefs = useRef<HTMLDivElement[]>([]);
  const realRefs = useRef<HTMLDivElement[]>([]);

  const cells: { row: number; col: number; v: number }[] = [];
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) { cells.push({ row: r, col: c, v: VALUES[r * COLS + c] }); }
  }

  useEffect(() => {
    const grid = gridRef.current;
    const reload = reloadRef.current;
    if (!grid || !reload) return undefined;
    const sks = skRefs.current!;
    const reals = realRefs.current!;
    if (!sks || !reals) return undefined;

    // 계산 겹: 오른쪽 위 모서리를 파원으로 두고 유클리드 거리를 파동 속도로 나눠 지연을 구한다
    function waveDelayMs(row: number, col: number) {
      const dx = COLS - 1 - col;
      const dy = row;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return Math.round((distance / WAVE_SPEED) * 1000);
    }

    cells.forEach((cell, i) => {
      const delay = waveDelayMs(cell.row, cell.col);
      sks[i].style.animationDelay = delay + 'ms';
      reals[i].style.animationDelay = delay + 'ms';
    });

    const timers: number[] = [];
    function human() {
      grid!.classList.remove(styles['is-demo']);
      grid!.setAttribute('aria-busy', 'true');
      let maxDelay = 0;
      cells.forEach((cell, i) => {
        const sk = sks[i];
        const real = reals[i];
        sk.getAnimations().forEach((a) => a.cancel());
        real.getAnimations().forEach((a) => a.cancel());
        sk.style.animation = 'none';
        real.style.animation = 'none';
        sk.style.opacity = '1';
        real.style.opacity = '0';
        real.style.transform = 'scale(.9)';
        const delay = waveDelayMs(cell.row, cell.col);
        if (delay > maxDelay) { maxDelay = delay; }
        timers.push(window.setTimeout(() => {
          sk.style.transition = 'opacity 200ms ease-out';
          real.style.transition = 'opacity 200ms ease-out, transform 200ms ease-out';
          sk.style.opacity = '0';
          real.style.opacity = '1';
          real.style.transform = 'scale(1)';
        }, 200 + delay));
      });
      timers.push(window.setTimeout(() => { grid!.setAttribute('aria-busy', 'false'); }, 200 + maxDelay + 260));
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
      <div className={styles.ch + ' ' + styles['is-demo']} ref={gridRef} role="img" aria-label="요일별 활동량 히트맵" aria-busy="true">
        {cells.map((cell, i) => (
          <div className={styles.chCell} data-row={cell.row} data-col={cell.col} key={i}>
            <div className={styles.chSk} ref={(el: HTMLDivElement | null) => { if (el) skRefs.current![i] = el; }} />
            <div
              className={styles.chReal + ' ' + BUCKET_CLASS[bucket(cell.v)]}
              ref={(el: HTMLDivElement | null) => { if (el) realRefs.current![i] = el; }}
            />
          </div>
        ))}
      </div>
      <button type="button" className={styles.chReload} ref={reloadRef}>히트맵 다시 불러오기</button>
    </main>
  );
}
