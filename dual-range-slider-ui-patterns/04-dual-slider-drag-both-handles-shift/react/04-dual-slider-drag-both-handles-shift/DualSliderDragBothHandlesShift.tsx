import { useEffect, useRef } from 'react';
import styles from './DualSliderDragBothHandlesShift.module.scss';

const MIN = 0;
const MAX = 100;
const TICK_MS = 480;
const CENTERS = [25, 70, 45, 85, 15];

export default function DualSliderDragBothHandlesShift() {
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

    const v = { lo: 10, hi: 40 };

    function paint() {
      lo!.style.left = v.lo + '%'; hi!.style.left = v.hi + '%';
      fill!.style.left = v.lo + '%'; fill!.style.width = (v.hi - v.lo) + '%';
      lo!.setAttribute('aria-valuenow', String(v.lo)); hi!.setAttribute('aria-valuenow', String(v.hi));
      lo!.setAttribute('aria-valuetext', String(v.lo)); hi!.setAttribute('aria-valuetext', String(v.hi));
      loOut!.textContent = String(v.lo); hiOut!.textContent = String(v.hi);
    }
    function setLo(n: number) { v.lo = Math.max(MIN, Math.min(n, v.hi)); paint(); }
    function setHi(n: number) { v.hi = Math.min(MAX, Math.max(n, v.lo)); paint(); }
    // 계산 겹: 폭(hi-lo)은 그대로 두고 두 값을 같은 delta 만큼 평행 이동시키되, 끝단에 닿으면 그 자리에서 멈춘다.
    function shiftBoth(deltaPct: number) {
      const w = v.hi - v.lo;
      let nlo = v.lo + deltaPct;
      nlo = Math.max(MIN, Math.min(nlo, MAX - w));
      v.lo = nlo; v.hi = nlo + w;
      paint();
    }
    function pctFromX(x: number) {
      const r = track!.getBoundingClientRect();
      return ((x - r.left) / r.width) * 100;
    }
    let timer = 0;
    function human() { root!.classList.remove(styles['is-demo']); window.clearInterval(timer); }

    function bindDrag(thumb: HTMLButtonElement, setter: (n: number) => void, isLo: boolean) {
      function onDown(e: PointerEvent) {
        human(); e.stopPropagation(); thumb.setPointerCapture(e.pointerId);
        function move(ev: PointerEvent) { setter(Math.round(pctFromX(ev.clientX))); }
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

    function onFillDown(e: PointerEvent) {
      human(); fill!.setPointerCapture(e.pointerId);
      let startX = e.clientX;
      const r = track!.getBoundingClientRect();
      function move(ev: PointerEvent) {
        const deltaPct = (ev.clientX - startX) / r.width * 100;
        shiftBoth(deltaPct);
        startX = ev.clientX;
      }
      function up() { fill!.removeEventListener('pointermove', move); fill!.removeEventListener('pointerup', up); }
      fill!.addEventListener('pointermove', move); fill!.addEventListener('pointerup', up);
    }
    fill.addEventListener('pointerdown', onFillDown);

    const width = v.hi - v.lo;
    let pi = 0;
    function tick() {
      const c = CENTERS[pi % CENTERS.length]; pi++;
      const target = c - width / 2;
      shiftBoth(target - v.lo);
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) timer = window.setInterval(tick, TICK_MS);
    paint();

    return () => { offLo(); offHi(); fill!.removeEventListener('pointerdown', onFillDown); window.clearInterval(timer); };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ds + ' ' + styles['is-demo']} ref={rootRef}>
        <div className={styles.dsTrack} ref={trackRef}>
          <div className={styles.dsFill} ref={fillRef} />
          <button type="button" className={styles.dsThumb + ' ' + styles.dsThumbLo} ref={loRef} role="slider"
            aria-label="최소값" aria-valuemin={0} aria-valuemax={100} aria-valuenow={10} aria-valuetext="10" tabIndex={0} />
          <button type="button" className={styles.dsThumb + ' ' + styles.dsThumbHi} ref={hiRef} role="slider"
            aria-label="최대값" aria-valuemin={0} aria-valuemax={100} aria-valuenow={40} aria-valuetext="40" tabIndex={0} />
        </div>
        <p className={styles.dsReadout}><span ref={loOutRef}>10</span> – <span ref={hiOutRef}>40</span></p>
        <p className={styles.dsCaption}>구간 가운데를 끌면 폭은 그대로 이동</p>
      </div>
    </main>
  );
}
