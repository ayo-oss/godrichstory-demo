import { useEffect, useRef } from 'react';
import styles from './ChartLoadingLinePathReveal.module.scss';

const SETS = [
  'M10,88 L52,50 L94,70 L136,26 L178,54 L220,16 L250,34',
  'M10,40 L52,74 L94,30 L136,58 L178,20 L220,48 L250,12'
];
const PX_PER_PCT = 6; // 계산 상수: 길이 6px 마다 그리기 구간 1% 를 배정한다

export default function ChartLoadingLinePathReveal() {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const realRef = useRef<SVGPathElement>(null);
  const reloadRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    const real = realRef.current;
    const reload = reloadRef.current;
    if (!root || !svg || !real || !reload) return undefined;

    let setIndex = 0;
    const styleTag = document.createElement('style');
    document.head.appendChild(styleTag);

    // 계산 겹: 선의 전체 길이(getTotalLength)로 그려지는 데 필요한 구간(%)을 정한다 — 길수록 오래 그려진다
    function drawPercent(len: number) { return Math.max(20, Math.min(48, Math.round(len / PX_PER_PCT))); }

    function prepare() {
      const len = Math.round(real!.getTotalLength());
      const pct = drawPercent(len);
      real!.style.strokeDasharray = String(len);
      real!.style.strokeDashoffset = String(len);
      styleTag.textContent =
        '@keyframes clDraw {' +
        '0%{stroke-dashoffset:' + len + ';}' +
        '14%{stroke-dashoffset:' + len + ';}' +
        pct + '%{stroke-dashoffset:0;}' +
        '86%{stroke-dashoffset:0;}' +
        '100%{stroke-dashoffset:' + len + ';}}';
      real!.style.animation = 'clDraw 2000ms ease-in-out infinite';
      return { len, pct };
    }

    prepare();

    function human() {
      root!.classList.remove(styles['is-demo']);
      setIndex = (setIndex + 1) % SETS.length;
      real!.setAttribute('d', SETS[setIndex]);
      real!.getAnimations().forEach((a) => a.cancel());
      const meta = prepare();
      real!.style.animation = 'none';
      svg!.setAttribute('aria-busy', 'true');
      real!.animate(
        [{ strokeDashoffset: meta.len }, { strokeDashoffset: 0 }],
        { duration: 260 + meta.len * 4, easing: 'ease-in-out', fill: 'forwards' }
      ).finished.then(() => { svg!.setAttribute('aria-busy', 'false'); });
    }

    function onClick() { human(); }
    function onKey(e: KeyboardEvent) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); human(); } }
    reload.addEventListener('click', onClick);
    reload.addEventListener('keydown', onKey);

    // 실제 브라우저 재생에서는 주기마다 aria-busy 를 실제로 오르내린다 (렌더 캡처는 실시간을 다 안 쓴다)
    const timers: number[] = [];
    const timer = window.setInterval(() => {
      if (!root!.classList.contains(styles['is-demo'])) return;
      svg!.setAttribute('aria-busy', 'true');
      timers.push(window.setTimeout(() => { svg!.setAttribute('aria-busy', 'false'); }, 300));
    }, 2000);

    return () => {
      reload.removeEventListener('click', onClick);
      reload.removeEventListener('keydown', onKey);
      window.clearInterval(timer);
      timers.forEach((id) => window.clearTimeout(id));
      styleTag.remove();
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cl + ' ' + styles['is-demo']} ref={rootRef}>
        <svg className={styles.clSvg} ref={svgRef} viewBox="0 0 260 110" role="img" aria-label="주간 방문자 추이 라인 그래프" aria-busy="true">
          <path className={styles.clFlat} d="M10,66 L250,66" />
          <path className={styles.clReal} ref={realRef} d="M10,88 L52,50 L94,70 L136,26 L178,54 L220,16 L250,34" />
        </svg>
        <button type="button" className={styles.clReload} ref={reloadRef}>다른 주간 데이터</button>
      </div>
    </main>
  );
}
