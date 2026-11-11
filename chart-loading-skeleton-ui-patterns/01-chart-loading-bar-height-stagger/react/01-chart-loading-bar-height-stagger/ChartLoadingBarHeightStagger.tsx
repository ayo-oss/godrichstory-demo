import { useEffect, useRef } from 'react';
import styles from './ChartLoadingBarHeightStagger.module.scss';

const VALUES = [38, 82, 55, 96, 29, 68];
const STAGGER_MS = 70;
const SKELETON_SCALE = 0.16;

export default function ChartLoadingBarHeightStagger() {
  const rootRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const reloadRef = useRef<HTMLButtonElement>(null);
  const barRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    const chart = chartRef.current;
    const reload = reloadRef.current;
    if (!root || !chart || !reload) return undefined;
    const bars = barRefs.current!;
    if (!bars || bars.length !== VALUES.length) return undefined;

    // 계산 겹: 막대 등장 지연을 열 번호(i)로 계산한다 — 열이 오른쪽일수록 늦게 실제 높이로 펴진다
    function barDelay(i: number) { return i * STAGGER_MS; }

    bars.forEach((bar, i) => {
      bar.style.setProperty('--real', String(VALUES[i] / 100));
      bar.style.setProperty('--phase', barDelay(i) + 'ms');
    });

    function paintNow(i: number, value: number) {
      bars[i].style.transform = 'scaleY(' + (value / 100) + ')';
      bars[i].style.opacity = '1';
    }
    function skeletonNow(i: number) {
      bars[i].style.transform = 'scaleY(' + SKELETON_SCALE + ')';
      bars[i].style.opacity = '.32';
    }

    const timers: number[] = [];
    function human() {
      root!.classList.remove(styles['is-demo']);
      bars.forEach((_bar, i) => skeletonNow(i));
      chart!.setAttribute('aria-busy', 'true');
      bars.forEach((_bar, i) => {
        timers.push(window.setTimeout(() => paintNow(i, VALUES[i]), 260 + barDelay(i)));
      });
      timers.push(window.setTimeout(() => chart!.setAttribute('aria-busy', 'false'), 260 + barDelay(VALUES.length - 1) + 200));
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
      <div className={styles.cb + ' ' + styles['is-demo']} ref={rootRef}>
        <div className={styles.cbChart} ref={chartRef} role="img" aria-label="월별 방문자 막대 그래프" aria-busy="true">
          {VALUES.map((_value, i) => (
            <div className={styles.cbCol} data-i={i} key={i}>
              <div
                className={styles.cbBar}
                ref={(el: HTMLDivElement | null) => { if (el) barRefs.current![i] = el; }}
              />
            </div>
          ))}
        </div>
        <button type="button" className={styles.cbReload} ref={reloadRef}>다시 불러오기</button>
      </div>
    </main>
  );
}
