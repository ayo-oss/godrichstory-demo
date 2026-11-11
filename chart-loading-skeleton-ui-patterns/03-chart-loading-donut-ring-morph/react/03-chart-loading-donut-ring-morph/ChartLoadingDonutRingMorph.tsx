import { useEffect, useRef } from 'react';
import styles from './ChartLoadingDonutRingMorph.module.scss';

const VALUES = [35, 25, 22, 18];
const R = 45;
const CIRC = 2 * Math.PI * R;

export default function ChartLoadingDonutRingMorph() {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const reloadRef = useRef<HTMLButtonElement>(null);
  const segRefs = useRef<SVGCircleElement[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    const reload = reloadRef.current;
    if (!root || !svg || !reload) return undefined;
    const segs = segRefs.current!;
    if (!segs || segs.length !== VALUES.length) return undefined;

    // 계산 겹: 각 구간의 비율을 원둘레 길이로 바꾸고, 시작 각도(누적 비율)로 순서를 정한다
    function layout() {
      let cum = 0;
      VALUES.forEach((v, i) => {
        const frac = v / 100;
        const segLen = CIRC * frac;
        segs[i].style.strokeDasharray = segLen.toFixed(2) + ' ' + (CIRC - segLen).toFixed(2);
        segs[i].style.strokeDashoffset = (-cum).toFixed(2);
        segs[i].style.setProperty('--delay', (cum / CIRC * 60) + '%');
        cum += segLen;
      });
    }
    layout();

    const timers: number[] = [];
    function human() {
      root!.classList.remove(styles['is-demo']);
      segs.forEach((s) => { s.style.opacity = '0'; s.style.transform = 'scale(.9)'; });
      svg!.setAttribute('aria-busy', 'true');
      let cum = 0;
      VALUES.forEach((v, i) => {
        const frac = v / 100;
        const delayMs = (cum / CIRC) * 900;
        cum += CIRC * frac;
        timers.push(window.setTimeout(() => {
          segs[i].style.transition = 'opacity 260ms ease-out, transform 260ms ease-out';
          segs[i].style.opacity = '1';
          segs[i].style.transform = 'scale(1)';
        }, 220 + delayMs));
      });
      timers.push(window.setTimeout(() => { svg!.setAttribute('aria-busy', 'false'); }, 220 + 900));
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
      <div className={styles.cd + ' ' + styles['is-demo']} ref={rootRef}>
        <svg className={styles.cdSvg} ref={svgRef} viewBox="0 0 120 120" role="img" aria-label="완료율 도넛 그래프" aria-busy="true">
          <circle className={styles.cdTrack} cx={60} cy={60} r={45} />
          <circle className={styles.cdSpin} cx={60} cy={60} r={45} />
          {VALUES.map((_v, i) => (
            <circle
              key={i}
              id={'cdSeg' + i}
              className={styles.cdSeg}
              cx={60}
              cy={60}
              r={45}
              data-i={i}
              ref={(el: SVGCircleElement | null) => { if (el) segRefs.current![i] = el; }}
            />
          ))}
        </svg>
        <button type="button" className={styles.cdReload} ref={reloadRef}>완료율 다시 집계</button>
      </div>
    </main>
  );
}
