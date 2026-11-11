import { useEffect, useRef } from 'react';
import styles from './ChartLoadingSparklineRowWave.module.scss';

const ROW_WAVE_MS = 90;
const LABELS = ['종목 A', '종목 B', '종목 C', '종목 D'];
// vanilla 와 동일하게 완성 리터럴로 둔다 — 문구.json 조각 분리(BD12 잔여한글) 방지
const TREND_LABELS = ['종목 A 추이', '종목 B 추이', '종목 C 추이', '종목 D 추이'];
const PATHS = [
  'M4,22 L26,16 L48,20 L70,8 L96,12',
  'M4,10 L26,18 L48,6 L70,16 L96,4',
  'M4,6 L26,12 L48,10 L70,20 L96,18',
  'M4,20 L26,8 L48,14 L70,10 L96,22'
];

export default function ChartLoadingSparklineRowWave() {
  const listRef = useRef<HTMLUListElement>(null);
  const rowRefs = useRef<HTMLLIElement[]>([]);
  const realRefs = useRef<SVGPathElement[]>([]);
  const flatRefs = useRef<SVGPathElement[]>([]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    const reals = realRefs.current!;
    const flats = flatRefs.current!;
    const rows = rowRefs.current!;
    if (!reals || !flats || !rows || reals.length !== PATHS.length) return undefined;

    // 계산 겹: 행 번호(i)로 물결 지연을 계산한다 — 위에서 아래로 갈수록 늦게 실제 선이 드러난다
    function rowDelay(i: number) { return i * ROW_WAVE_MS; }

    reals.forEach((real, i) => {
      const len = Math.round(real.getTotalLength());
      real.style.setProperty('--len', String(len));
      real.style.strokeDasharray = String(len);
      real.style.strokeDashoffset = String(len);
      real.style.animationDelay = rowDelay(i) + 'ms';
      flats[i].style.animationDelay = rowDelay(i) + 'ms';
      rows[i].style.animationDelay = rowDelay(i) + 'ms';
    });

    const timers: number[] = [];
    function human() {
      list!.classList.remove(styles['is-demo']);
      list!.setAttribute('aria-busy', 'true');
      reals.forEach((real, i) => {
        const len = parseInt(real.style.getPropertyValue('--len'), 10);
        real.getAnimations().forEach((a) => a.cancel());
        real.style.animation = 'none';
        real.style.strokeDashoffset = String(len);
        timers.push(window.setTimeout(() => {
          real.animate(
            [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
            { duration: 340, easing: 'ease-out', fill: 'forwards' }
          );
        }, rowDelay(i)));
      });
      timers.push(window.setTimeout(() => { list!.setAttribute('aria-busy', 'false'); }, rowDelay(reals.length - 1) + 400));
    }

    function onClick() { human(); }
    function onKey(e: KeyboardEvent) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); human(); } }
    list.addEventListener('click', onClick);
    list.addEventListener('keydown', onKey);

    return () => {
      list.removeEventListener('click', onClick);
      list.removeEventListener('keydown', onKey);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return (
    <main className={styles.stage}>
      <ul
        className={styles.cw + ' ' + styles['is-demo']}
        ref={listRef}
        aria-busy="true"
        tabIndex={0}
        role="button"
        aria-label="스파크라인 다시 불러오기"
      >
        {LABELS.map((label, i) => (
          <li
            className={styles.cwRow}
            data-i={i}
            key={i}
            ref={(el: HTMLLIElement | null) => { if (el) rowRefs.current![i] = el; }}
          >
            <span className={styles.cwLabel}>{label}</span>
            <svg className={styles.cwSpark} viewBox="0 0 100 28" role="img" aria-label={TREND_LABELS[i]}>
              <path
                className={styles.cwFlat}
                d="M4,14 L96,14"
                ref={(el: SVGPathElement | null) => { if (el) flatRefs.current![i] = el; }}
              />
              <path
                className={styles.cwReal}
                d={PATHS[i]}
                ref={(el: SVGPathElement | null) => { if (el) realRefs.current![i] = el; }}
              />
            </svg>
          </li>
        ))}
      </ul>
    </main>
  );
}
