import { useEffect, useRef } from 'react';
import styles from './DualSliderHistogramTrackBg.module.scss';

const MIN = 0;
const MAX = 100;
const TICK_MS = 480;
// 결정론적 분포 — Math.random 없이 고정 배열로 막대 높이를 정한다 (%, 0~100)
const HEIGHTS = [22, 40, 65, 38, 52, 70, 45, 60, 33, 48, 80, 55, 42, 66, 30, 58, 44, 72, 50, 36, 62, 48, 54, 40];
const PRESETS: [number, number][] = [[10, 35], [55, 90], [0, 100], [42, 48], [20, 65]];

export default function DualSliderHistogramTrackBg() {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const loRef = useRef<HTMLButtonElement>(null);
  const hiRef = useRef<HTMLButtonElement>(null);
  const loOutRef = useRef<HTMLSpanElement>(null);
  const hiOutRef = useRef<HTMLSpanElement>(null);
  const barRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const fill = fillRef.current;
    const lo = loRef.current;
    const hi = hiRef.current;
    const loOut = loOutRef.current;
    const hiOut = hiOutRef.current;
    if (!root || !track || !fill || !lo || !hi || !loOut || !hiOut || !barRefs.current) return undefined;
    const bars = barRefs.current;
    if (bars.length !== HEIGHTS.length) return undefined;

    const v = { lo: 30, hi: 72 };
    const centers = HEIGHTS.map((_, i) => (i + 0.5) / HEIGHTS.length * 100);

    // 계산 겹: 막대의 실제 중심 위치(%)가 [lo, hi] 구간 안에 들어오는지로 강조 여부를 결정한다.
    function paintBars() {
      bars.forEach((el, i) => {
        el.classList.toggle(styles['is-in'], centers[i] >= v.lo && centers[i] <= v.hi);
      });
    }
    function paint() {
      lo!.style.left = v.lo + '%'; hi!.style.left = v.hi + '%';
      fill!.style.left = v.lo + '%'; fill!.style.width = (v.hi - v.lo) + '%';
      lo!.setAttribute('aria-valuenow', String(v.lo)); hi!.setAttribute('aria-valuenow', String(v.hi));
      lo!.setAttribute('aria-valuetext', String(v.lo)); hi!.setAttribute('aria-valuetext', String(v.hi));
      loOut!.textContent = String(v.lo); hiOut!.textContent = String(v.hi);
      paintBars();
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

    let pi = 0;
    function tick() {
      const p = PRESETS[pi % PRESETS.length]; pi++;
      v.lo = p[0]; v.hi = p[1]; paint();
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) timer = window.setInterval(tick, TICK_MS);
    paint();

    return () => { offLo(); offHi(); window.clearInterval(timer); };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ds + ' ' + styles['is-demo']} ref={rootRef}>
        <div className={styles.dsHist} aria-hidden="true">
          {HEIGHTS.map((h, i) => (
            <div
              key={i}
              className={styles.dsBar}
              ref={(el: HTMLDivElement | null) => { if (el && barRefs.current) barRefs.current[i] = el; }}
              style={{ left: (i / HEIGHTS.length * 100) + '%', width: (100 / HEIGHTS.length * 0.7) + '%', height: h + '%' }}
            />
          ))}
        </div>
        <div className={styles.dsTrack} ref={trackRef}>
          <div className={styles.dsFill} ref={fillRef} />
          <button type="button" className={styles.dsThumb + ' ' + styles.dsThumbLo} ref={loRef} role="slider"
            aria-label="최소값" aria-valuemin={0} aria-valuemax={100} aria-valuenow={30} aria-valuetext="30" tabIndex={0} />
          <button type="button" className={styles.dsThumb + ' ' + styles.dsThumbHi} ref={hiRef} role="slider"
            aria-label="최대값" aria-valuemin={0} aria-valuemax={100} aria-valuenow={72} aria-valuetext="72" tabIndex={0} />
        </div>
        <p className={styles.dsReadout}><span ref={loOutRef}>30</span> – <span ref={hiOutRef}>72</span></p>
        <p className={styles.dsCaption}>막대 분포 위에서 구간만 밝힌다</p>
      </div>
    </main>
  );
}
