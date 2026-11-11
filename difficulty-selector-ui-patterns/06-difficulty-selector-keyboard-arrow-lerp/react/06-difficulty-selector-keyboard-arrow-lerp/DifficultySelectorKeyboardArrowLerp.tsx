import { useEffect, useRef } from 'react';
import styles from './DifficultySelectorKeyboardArrowLerp.module.scss';

const LEVELS = ['쉬움', '보통', '어려움', '매우 어려움', '최고'];
const TRAIL_LERP = 0.18;
const SEQUENCE = [3, 1, 4, 0, 2];
const TICK_MS = 850;

export default function DifficultySelectorKeyboardArrowLerp() {
  const rootRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const optRefs = useRef<HTMLButtonElement[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    const rowEl = rowRef.current;
    const ring = ringRef.current;
    if (!root || !rowEl || !ring || !optRefs.current) return undefined;
    const opts = optRefs.current;
    if (opts.length !== LEVELS.length) return undefined;

    let index = 0;
    let ringX = 0, ringW = 0, targetX = 0, targetW = 0, raf = 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function measure(i: number) {
      const r = opts[i].getBoundingClientRect();
      const pr = rowEl!.getBoundingClientRect();
      return { x: r.left - pr.left, w: r.width };
    }
    function paintRing(x: number, w: number) { ring!.style.transform = 'translateX(' + x + 'px)'; ring!.style.width = w + 'px'; }
    // 계산 겹: 매 프레임 남은 거리의 TRAIL_LERP 비율만 좁히는 지수 감쇠(lerp)로 고리가 목표를 뒤따라온다
    function loop() {
      ringX += (targetX - ringX) * TRAIL_LERP;
      ringW += (targetW - ringW) * TRAIL_LERP;
      paintRing(ringX, ringW);
      if (Math.abs(targetX - ringX) > 0.4 || Math.abs(targetW - ringW) > 0.4) raf = requestAnimationFrame(loop);
      else { ringX = targetX; ringW = targetW; paintRing(ringX, ringW); }
    }
    function moveRingTo(i: number) {
      const m = measure(i);
      targetX = m.x; targetW = m.w;
      cancelAnimationFrame(raf);
      if (reduce) { ringX = targetX; ringW = targetW; paintRing(ringX, ringW); return; }
      raf = requestAnimationFrame(loop);
    }
    let timer = 0;
    function human() { root!.classList.remove(styles['is-demo']); window.clearInterval(timer); }
    function select(i: number) {
      index = i;
      opts.forEach((o, idx) => {
        o.setAttribute('aria-checked', idx === i ? 'true' : 'false');
        o.setAttribute('tabindex', idx === i ? '0' : '-1');
      });
      moveRingTo(i);
    }

    const offs = opts.map((o, i) => {
      function onClick() { human(); select(i); opts[i].focus({ preventScroll: true }); }
      function onKey(e: KeyboardEvent) {
        if (e.key === 'ArrowRight') { e.preventDefault(); human(); const n = Math.min(opts.length - 1, index + 1); select(n); opts[n].focus({ preventScroll: true }); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); human(); const p = Math.max(0, index - 1); select(p); opts[p].focus({ preventScroll: true }); }
        else if (e.key === 'Home') { e.preventDefault(); human(); select(0); opts[0].focus({ preventScroll: true }); }
        else if (e.key === 'End') { e.preventDefault(); human(); select(opts.length - 1); opts[opts.length - 1].focus({ preventScroll: true }); }
      }
      o.addEventListener('click', onClick);
      o.addEventListener('keydown', onKey);
      return () => { o.removeEventListener('click', onClick); o.removeEventListener('keydown', onKey); };
    });

    let si = 0;
    function tick() { select(SEQUENCE[si % SEQUENCE.length]); si++; }
    if (!reduce) timer = window.setInterval(tick, TICK_MS);
    const m0 = measure(0); ringX = m0.x; ringW = m0.w; targetX = m0.x; targetW = m0.w; paintRing(ringX, ringW);

    return () => { offs.forEach((off) => off()); cancelAnimationFrame(raf); window.clearInterval(timer); };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.kal + ' ' + styles['is-demo']} ref={rootRef}>
        <div className={styles.kalRow} ref={rowRef} role="radiogroup" aria-label="난이도">
          <div className={styles.kalRing} ref={ringRef} aria-hidden="true" />
          {LEVELS.map((label, i) => (
            <button
              key={label}
              type="button"
              className={styles.kalOpt}
              ref={(el: HTMLButtonElement | null) => { if (el && optRefs.current) optRefs.current[i] = el; }}
              role="radio"
              aria-checked={i === 0 ? 'true' : 'false'}
              data-i={i}
              tabIndex={i === 0 ? 0 : -1}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
