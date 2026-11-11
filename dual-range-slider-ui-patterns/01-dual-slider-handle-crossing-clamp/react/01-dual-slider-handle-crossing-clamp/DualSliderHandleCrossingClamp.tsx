import { useEffect, useRef } from 'react';
import styles from './DualSliderHandleCrossingClamp.module.scss';

const MIN = 0;
const MAX = 100;
const GAP = 14;
const TICK_MS = 480;
const PRESETS: [number, number][] = [[40, 46], [10, 90], [55, 61], [20, 80], [35, 41]];

export default function DualSliderHandleCrossingClamp() {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const loRef = useRef<HTMLButtonElement>(null);
  const hiRef = useRef<HTMLButtonElement>(null);
  const loOutRef = useRef<HTMLSpanElement>(null);
  const hiOutRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const fill = fillRef.current;
    const lo = loRef.current;
    const hi = hiRef.current;
    const loOut = loOutRef.current;
    const hiOut = hiOutRef.current;
    if (!root || !track || !fill || !lo || !hi || !loOut || !hiOut) return undefined;

    const v = { lo: 15, hi: 85 };

    function paint() {
      lo!.style.left = v.lo + '%'; hi!.style.left = v.hi + '%';
      fill!.style.left = v.lo + '%'; fill!.style.width = (v.hi - v.lo) + '%';
      lo!.setAttribute('aria-valuenow', String(v.lo)); hi!.setAttribute('aria-valuenow', String(v.hi));
      lo!.setAttribute('aria-valuetext', String(v.lo)); hi!.setAttribute('aria-valuetext', String(v.hi));
      loOut!.textContent = String(v.lo); hiOut!.textContent = String(v.hi);
    }
    // 계산 겹: 최소값이 최대값 - GAP 을 넘지 못하게, 최대값이 최소값 + GAP 아래로 못 내려가게 막는다
    function setLo(n: number) {
      v.lo = Math.max(MIN, Math.min(n, v.hi - GAP));
      lo!.classList.toggle(styles['is-blocked'], n > v.hi - GAP);
      paint();
    }
    function setHi(n: number) {
      v.hi = Math.min(MAX, Math.max(n, v.lo + GAP));
      hi!.classList.toggle(styles['is-blocked'], n < v.lo + GAP);
      paint();
    }
    function pctFromX(x: number) {
      const r = track!.getBoundingClientRect();
      return Math.round(Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100)));
    }
    let timer = 0;
    function human() { root!.classList.remove(styles['is-demo']); window.clearInterval(timer); }

    function bindDrag(thumb: HTMLButtonElement, setter: (n: number) => void, isLo: boolean) {
      function onDown(e: PointerEvent) {
        human(); thumb.setPointerCapture(e.pointerId);
        function move(ev: PointerEvent) { setter(pctFromX(ev.clientX)); }
        function up() { thumb.removeEventListener('pointermove', move); thumb.removeEventListener('pointerup', up); }
        thumb.addEventListener('pointermove', move); thumb.addEventListener('pointerup', up);
      }
      function onKey(e: KeyboardEvent) {
        const step = ({ ArrowRight: 1, ArrowLeft: -1, ArrowUp: 1, ArrowDown: -1 } as Record<string, number>)[e.key];
        if (step !== undefined) { e.preventDefault(); human(); setter((isLo ? v.lo : v.hi) + step); }
        else if (e.key === 'Home') { e.preventDefault(); human(); setter(isLo ? MIN : v.lo + GAP); }
        else if (e.key === 'End') { e.preventDefault(); human(); setter(isLo ? v.hi - GAP : MAX); }
      }
      thumb.addEventListener('pointerdown', onDown);
      thumb.addEventListener('keydown', onKey);
      return () => { thumb.removeEventListener('pointerdown', onDown); thumb.removeEventListener('keydown', onKey); };
    }
    const offLo = bindDrag(lo, setLo, true);
    const offHi = bindDrag(hi, setHi, false);

    let pi = 0;
    function tick() {
      const p = PRESETS[pi % PRESETS.length]; pi++;
      setLo(p[0]); setHi(p[1]);
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) timer = window.setInterval(tick, TICK_MS);
    paint();

    return () => { offLo(); offHi(); window.clearInterval(timer); };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ds + ' ' + styles['is-demo']} ref={rootRef}>
        <div className={styles.dsTrack} ref={trackRef}>
          <div className={styles.dsFill} ref={fillRef} />
          <button type="button" className={styles.dsThumb + ' ' + styles.dsThumbLo} ref={loRef} role="slider"
            aria-label="최소값" aria-valuemin={0} aria-valuemax={100} aria-valuenow={15} aria-valuetext="15" tabIndex={0} />
          <button type="button" className={styles.dsThumb + ' ' + styles.dsThumbHi} ref={hiRef} role="slider"
            aria-label="최대값" aria-valuemin={0} aria-valuemax={100} aria-valuenow={85} aria-valuetext="85" tabIndex={0} />
        </div>
        <p className={styles.dsReadout}><span ref={loOutRef}>15</span> – <span ref={hiOutRef}>85</span></p>
        <p className={styles.dsCaption}>간격 14 이상 유지</p>
      </div>
    </main>
  );
}
