import { useEffect, useRef } from 'react';
import styles from './DualSliderSnapStepTicks.module.scss';

const MIN = 0;
const MAX = 100;
const STEP = 10;
const TICK_MS = 480;
const TICK_VALUES: number[] = [];
for (let n = MIN; n <= MAX; n += STEP) TICK_VALUES.push(n);
const PRESETS: [number, number][] = [[0, 100], [30, 60], [10, 90], [40, 50], [20, 80]];

export default function DualSliderSnapStepTicks() {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const loRef = useRef<HTMLButtonElement>(null);
  const hiRef = useRef<HTMLButtonElement>(null);
  const loOutRef = useRef<HTMLSpanElement>(null);
  const hiOutRef = useRef<HTMLSpanElement>(null);
  const tickRefs = useRef<HTMLSpanElement[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const fill = fillRef.current;
    const lo = loRef.current;
    const hi = hiRef.current;
    const loOut = loOutRef.current;
    const hiOut = hiOutRef.current;
    if (!root || !track || !fill || !lo || !hi || !loOut || !hiOut || !tickRefs.current) return undefined;
    const ticks = tickRefs.current;

    const v = { lo: 20, hi: 70 };

    // 계산 겹: 눈금을 %가 아니라 트랙의 실측 픽셀 폭(getBoundingClientRect)으로 위치를 다시 계산해 배치한다.
    function layoutTicks() {
      const r = track!.getBoundingClientRect();
      ticks.forEach((el, i) => {
        const x = r.width * (TICK_VALUES[i] - MIN) / (MAX - MIN);
        el.style.left = Math.round(x) + 'px';
      });
    }
    function snap(n: number) { return Math.max(MIN, Math.min(MAX, Math.round(n / STEP) * STEP)); }
    function paint() {
      lo!.style.left = v.lo + '%'; hi!.style.left = v.hi + '%';
      fill!.style.left = v.lo + '%'; fill!.style.width = (v.hi - v.lo) + '%';
      lo!.setAttribute('aria-valuenow', String(v.lo)); hi!.setAttribute('aria-valuenow', String(v.hi));
      lo!.setAttribute('aria-valuetext', String(v.lo)); hi!.setAttribute('aria-valuetext', String(v.hi));
      loOut!.textContent = String(v.lo); hiOut!.textContent = String(v.hi);
    }
    function setLo(n: number) { v.lo = Math.min(snap(n), v.hi); paint(); }
    function setHi(n: number) { v.hi = Math.max(snap(n), v.lo); paint(); }
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
        const step = ({ ArrowRight: STEP, ArrowLeft: -STEP, ArrowUp: STEP, ArrowDown: -STEP } as Record<string, number>)[e.key];
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
    window.addEventListener('resize', layoutTicks);

    let pi = 0;
    function tick() {
      const p = PRESETS[pi % PRESETS.length]; pi++;
      v.lo = p[0]; v.hi = p[1]; paint();
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) timer = window.setInterval(tick, TICK_MS);
    layoutTicks();
    paint();

    return () => { offLo(); offHi(); window.removeEventListener('resize', layoutTicks); window.clearInterval(timer); };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ds + ' ' + styles['is-demo']} ref={rootRef}>
        <div className={styles.dsTrack} ref={trackRef}>
          <div className={styles.dsTicks} aria-hidden="true">
            {TICK_VALUES.map((n, i) => (
              <span key={n} className={styles.dsTick} ref={(el: HTMLSpanElement | null) => { if (el && tickRefs.current) tickRefs.current[i] = el; }} />
            ))}
          </div>
          <div className={styles.dsFill} ref={fillRef} />
          <button type="button" className={styles.dsThumb + ' ' + styles.dsThumbLo} ref={loRef} role="slider"
            aria-label="최소값" aria-valuemin={0} aria-valuemax={100} aria-valuenow={20} aria-valuetext="20" tabIndex={0} />
          <button type="button" className={styles.dsThumb + ' ' + styles.dsThumbHi} ref={hiRef} role="slider"
            aria-label="최대값" aria-valuemin={0} aria-valuemax={100} aria-valuenow={70} aria-valuetext="70" tabIndex={0} />
        </div>
        <p className={styles.dsReadout}><span ref={loOutRef}>20</span> – <span ref={hiOutRef}>70</span></p>
        <p className={styles.dsCaption}>10 단위 눈금에만 멈춘다</p>
      </div>
    </main>
  );
}
