import { useEffect, useRef } from 'react';
import styles from './ChartLoadingMultiSeriesCascade.module.scss';

const STEP_MS = 220;
const DAMPING = 0.55;
const PATHS = [
  'M4,70 L44,52 L84,64 L124,34 L164,46 L196,26',
  'M4,50 L44,66 L84,40 L124,58 L164,30 L196,44',
  'M4,30 L44,38 L84,20 L124,42 L164,18 L196,32'
];

export default function ChartLoadingMultiSeriesCascade() {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const reloadRef = useRef<HTMLButtonElement>(null);
  const seriesRefs = useRef<SVGPathElement[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    const reload = reloadRef.current;
    if (!root || !svg || !reload) return undefined;
    const series = seriesRefs.current!;
    if (!series || series.length !== PATHS.length) return undefined;

    // 계산 겹: 계열 지연을 감쇠(등비) 누적으로 계산한다 — 뒤 계열일수록 늘어나는 간격이 줄어들며 안정된다
    function seriesDelay(i: number) {
      let total = 0;
      for (let k = 1; k <= i; k += 1) { total += STEP_MS * Math.pow(DAMPING, k - 1); }
      return Math.round(total);
    }

    series.forEach((path, i) => {
      const len = Math.round(path.getTotalLength());
      path.style.setProperty('--len', String(len));
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
      path.style.animationDelay = seriesDelay(i) + 'ms';
    });

    const timers: number[] = [];
    function human() {
      root!.classList.remove(styles['is-demo']);
      svg!.setAttribute('aria-busy', 'true');
      let lastDelay = 0;
      series.forEach((path, i) => {
        const len = parseInt(path.style.getPropertyValue('--len'), 10);
        path.getAnimations().forEach((a) => a.cancel());
        path.style.animation = 'none';
        path.style.strokeDashoffset = String(len);
        const delayMs = seriesDelay(i);
        lastDelay = delayMs;
        timers.push(window.setTimeout(() => {
          path.animate(
            [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
            { duration: 420, easing: 'ease-out', fill: 'forwards' }
          );
        }, 200 + delayMs));
      });
      timers.push(window.setTimeout(() => { svg!.setAttribute('aria-busy', 'false'); }, 200 + lastDelay + 500));
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
      <div className={styles.cm + ' ' + styles['is-demo']} ref={rootRef}>
        <svg className={styles.cmSvg} ref={svgRef} viewBox="0 0 200 100" role="img" aria-label="계열 3종 추이 그래프" aria-busy="true">
          <line className={styles.cmAxis} x1={4} y1={92} x2={196} y2={92} />
          <path className={styles.cmFlat} d="M4,60 L196,60" />
          {PATHS.map((d, i) => (
            <path
              key={i}
              id={'cmSeries' + i}
              className={styles.cmSeries}
              data-i={i}
              d={d}
              ref={(el: SVGPathElement | null) => { if (el) seriesRefs.current![i] = el; }}
            />
          ))}
        </svg>
        <button type="button" className={styles.cmReload} ref={reloadRef}>그래프 다시 불러오기</button>
      </div>
    </main>
  );
}
