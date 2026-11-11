import { useEffect, useRef } from 'react';
import styles from './DualSliderMinGapElasticPush.module.scss';

const MIN = 0;
const MAX = 100;
const MIN_GAP = 12;
const K = 210;
const DAMP = 18;
const TICK_MS = 480;
const SEQ: { who: 'lo' | 'hi'; to: number }[] = [
  { who: 'lo', to: 62 },
  { who: 'hi', to: 25 },
  { who: 'lo', to: 55 },
  { who: 'hi', to: 15 },
  { who: 'lo', to: 20 }
];

export default function DualSliderMinGapElasticPush() {
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const loRef = useRef<HTMLButtonElement>(null);
  const hiRef = useRef<HTMLButtonElement>(null);
  const loOutRef = useRef<HTMLSpanElement>(null);
  const hiOutRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const fill = fillRef.current;
    const lo = loRef.current;
    const hi = hiRef.current;
    const loOut = loOutRef.current;
    const hiOut = hiOutRef.current;
    if (!track || !fill || !lo || !hi || !loOut || !hiOut) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const target = { lo: 20, hi: 70 };
    const pos = { lo: { v: 20, vel: 0 }, hi: { v: 70, vel: 0 } };

    function paintAria() {
      lo!.setAttribute('aria-valuenow', String(target.lo)); hi!.setAttribute('aria-valuenow', String(target.hi));
      lo!.setAttribute('aria-valuetext', String(target.lo)); hi!.setAttribute('aria-valuetext', String(target.hi));
      loOut!.textContent = String(target.lo); hiOut!.textContent = String(target.hi);
    }
    function paintVisual() {
      lo!.style.left = pos.lo.v + '%'; hi!.style.left = pos.hi.v + '%';
      fill!.style.left = pos.lo.v + '%'; fill!.style.width = Math.max(0, pos.hi.v - pos.lo.v) + '%';
    }
    function syncReduced() {
      if (!reduce) return;
      pos.lo.v = target.lo; pos.hi.v = target.hi; paintVisual();
    }
    // 계산 겹: 간격이 MIN_GAP 아래로 좁혀지면 반대쪽 목표값을 함께 밀어내고, 시각 위치는 스프링(질량-감쇠) 물리로 목표를 뒤쫓아 오버슈트한다.
    function setLo(n: number) {
      let nlo = Math.max(MIN, Math.min(n, MAX));
      if (nlo > target.hi - MIN_GAP) {
        target.hi = Math.min(MAX, nlo + MIN_GAP);
        nlo = Math.min(nlo, target.hi - MIN_GAP);
      }
      target.lo = nlo; paintAria(); syncReduced();
    }
    function setHi(n: number) {
      let nhi = Math.min(MAX, Math.max(n, MIN));
      if (nhi < target.lo + MIN_GAP) {
        target.lo = Math.max(MIN, nhi - MIN_GAP);
        nhi = Math.max(nhi, target.lo + MIN_GAP);
      }
      target.hi = nhi; paintAria(); syncReduced();
    }
    function pctFromX(x: number) {
      const r = track!.getBoundingClientRect();
      return Math.round(Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100)));
    }
    let timer = 0;
    function human() { window.clearInterval(timer); }

    function bindDrag(thumb: HTMLButtonElement, setter: (n: number) => void, isLo: boolean) {
      function onDown(e: PointerEvent) {
        human(); thumb.setPointerCapture(e.pointerId);
        function move(ev: PointerEvent) { setter(pctFromX(ev.clientX)); }
        function up() { thumb.removeEventListener('pointermove', move); thumb.removeEventListener('pointerup', up); }
        thumb.addEventListener('pointermove', move); thumb.addEventListener('pointerup', up);
      }
      function onKey(e: KeyboardEvent) {
        const step = ({ ArrowRight: 1, ArrowLeft: -1, ArrowUp: 1, ArrowDown: -1 } as Record<string, number>)[e.key];
        if (step !== undefined) { e.preventDefault(); human(); setter((isLo ? target.lo : target.hi) + step); }
        else if (e.key === 'Home') { e.preventDefault(); human(); setter(isLo ? MIN : target.lo + MIN_GAP); }
        else if (e.key === 'End') { e.preventDefault(); human(); setter(isLo ? target.hi - MIN_GAP : MAX); }
      }
      thumb.addEventListener('pointerdown', onDown);
      thumb.addEventListener('keydown', onKey);
      return () => { thumb.removeEventListener('pointerdown', onDown); thumb.removeEventListener('keydown', onKey); };
    }
    const offLo = bindDrag(lo, setLo, true);
    const offHi = bindDrag(hi, setHi, false);

    let last: number | null = null;
    let rafId = 0;
    let stopped = false;
    function springFrame(ts: number) {
      if (stopped) return;
      if (reduce) { pos.lo.v = target.lo; pos.hi.v = target.hi; paintVisual(); return; }
      if (last === null) last = ts;
      const dt = Math.min(0.032, (ts - last) / 1000); last = ts;
      (['lo', 'hi'] as const).forEach((k) => {
        const s = pos[k]; const t = target[k];
        const force = -K * (s.v - t) - DAMP * s.vel;
        s.vel += force * dt; s.v += s.vel * dt;
      });
      paintVisual();
      rafId = requestAnimationFrame(springFrame);
    }
    if (!reduce) rafId = requestAnimationFrame(springFrame);

    let si = 0;
    function tick() {
      const step = SEQ[si % SEQ.length]; si++;
      if (step.who === 'lo') setLo(step.to); else setHi(step.to);
    }
    if (!reduce) timer = window.setInterval(tick, TICK_MS);
    paintAria(); paintVisual();

    return () => { offLo(); offHi(); stopped = true; cancelAnimationFrame(rafId); window.clearInterval(timer); };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ds} id="ds">
        <div className={styles.dsTrack} ref={trackRef}>
          <div className={styles.dsFill} ref={fillRef} />
          <button type="button" className={styles.dsThumb + ' ' + styles.dsThumbLo} ref={loRef} role="slider"
            aria-label="최소값" aria-valuemin={0} aria-valuemax={100} aria-valuenow={20} aria-valuetext="20" tabIndex={0} />
          <button type="button" className={styles.dsThumb + ' ' + styles.dsThumbHi} ref={hiRef} role="slider"
            aria-label="최대값" aria-valuemin={0} aria-valuemax={100} aria-valuenow={70} aria-valuetext="70" tabIndex={0} />
        </div>
        <p className={styles.dsReadout}><span ref={loOutRef}>20</span> – <span ref={hiOutRef}>70</span></p>
        <p className={styles.dsCaption}>간격 12 이하로 좁히면 반대쪽이 탄성으로 밀린다</p>
      </div>
    </main>
  );
}
