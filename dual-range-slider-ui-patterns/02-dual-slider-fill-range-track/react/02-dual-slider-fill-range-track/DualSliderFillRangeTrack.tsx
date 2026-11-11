import { useEffect, useRef } from 'react';
import styles from './DualSliderFillRangeTrack.module.scss';

const MIN = 0;
const MAX = 100;
const TICK_MS = 480;
const PRESETS: [number, number, number][] = [[8, 92, 0.15], [30, 55, 0.9], [45, 88, 0.35], [12, 40, 0.7], [60, 96, 0.5]];

export default function DualSliderFillRangeTrack() {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const sweepRef = useRef<HTMLDivElement>(null);
  const loRef = useRef<HTMLButtonElement>(null);
  const hiRef = useRef<HTMLButtonElement>(null);
  const loOutRef = useRef<HTMLSpanElement>(null);
  const hiOutRef = useRef<HTMLSpanElement>(null);
  const pxOutRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const fill = fillRef.current;
    const sweep = sweepRef.current;
    const lo = loRef.current;
    const hi = hiRef.current;
    const loOut = loOutRef.current;
    const hiOut = hiOutRef.current;
    const pxOut = pxOutRef.current;
    if (!root || !track || !fill || !sweep || !lo || !hi || !loOut || !hiOut || !pxOut) return undefined;

    const v = { lo: 20, hi: 78, phase: 0.2 };

    // 계산 겹: 두 값을 트랙 채움 %로 바꾸고, 실측 트랙 폭(getBoundingClientRect)으로 채움을 px 로도 환산한다.
    function paint() {
      lo!.style.left = v.lo + '%'; hi!.style.left = v.hi + '%';
      fill!.style.left = v.lo + '%'; fill!.style.width = (v.hi - v.lo) + '%';
      const sweepPct = v.lo + (v.hi - v.lo) * v.phase;
      const trackPct = v.hi - v.lo === 0 ? 0 : (sweepPct - v.lo) / (v.hi - v.lo) * 100;
      sweep!.style.left = trackPct + '%';
      lo!.setAttribute('aria-valuenow', String(v.lo)); hi!.setAttribute('aria-valuenow', String(v.hi));
      lo!.setAttribute('aria-valuetext', String(v.lo)); hi!.setAttribute('aria-valuetext', String(v.hi));
      loOut!.textContent = String(v.lo); hiOut!.textContent = String(v.hi);
      const r = track!.getBoundingClientRect();
      pxOut!.textContent = String(Math.round(r.width * (v.hi - v.lo) / 100));
    }
    function setLo(n: number) { v.lo = Math.max(MIN, Math.min(n, v.hi)); paint(); }
    function setHi(n: number) { v.hi = Math.min(MAX, Math.max(n, v.lo)); paint(); }
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
        else if (e.key === 'Home') { e.preventDefault(); human(); setter(isLo ? MIN : v.lo); }
        else if (e.key === 'End') { e.preventDefault(); human(); setter(isLo ? v.hi : MAX); }
      }
      thumb.addEventListener('pointerdown', onDown);
      thumb.addEventListener('keydown', onKey);
      return () => { thumb.removeEventListener('pointerdown', onDown); thumb.removeEventListener('keydown', onKey); };
    }
    const offLo = bindDrag(lo, setLo, true);
    const offHi = bindDrag(hi, setHi, false);
    window.addEventListener('resize', paint);

    let pi = 0;
    function tick() {
      const p = PRESETS[pi % PRESETS.length]; pi++;
      v.lo = p[0]; v.hi = p[1]; v.phase = p[2];
      paint();
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) timer = window.setInterval(tick, TICK_MS);
    paint();

    return () => { offLo(); offHi(); window.removeEventListener('resize', paint); window.clearInterval(timer); };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ds + ' ' + styles['is-demo']} ref={rootRef}>
        <div className={styles.dsTrack} ref={trackRef}>
          <div className={styles.dsFill} ref={fillRef}>
            <div className={styles.dsSweep} ref={sweepRef} />
          </div>
          <button type="button" className={styles.dsThumb + ' ' + styles.dsThumbLo} ref={loRef} role="slider"
            aria-label="최소값" aria-valuemin={0} aria-valuemax={100} aria-valuenow={20} aria-valuetext="20" tabIndex={0} />
          <button type="button" className={styles.dsThumb + ' ' + styles.dsThumbHi} ref={hiRef} role="slider"
            aria-label="최대값" aria-valuemin={0} aria-valuemax={100} aria-valuenow={78} aria-valuetext="78" tabIndex={0} />
        </div>
        <p className={styles.dsReadout}><span ref={loOutRef}>20</span> – <span ref={hiOutRef}>78</span></p>
        <p className={styles.dsCaption}>채움 폭 <span ref={pxOutRef}>0</span>px</p>
      </div>
    </main>
  );
}
