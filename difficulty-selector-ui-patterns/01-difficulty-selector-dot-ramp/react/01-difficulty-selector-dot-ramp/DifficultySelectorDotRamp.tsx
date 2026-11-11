import { useEffect, useRef } from 'react';
import styles from './DifficultySelectorDotRamp.module.scss';

const LEVELS = ['쉬움', '보통', '어려움', '매우 어려움', '최고'];
const HUE_LOW = 132, HUE_HIGH = 0, SAT = 46, LIGHT = 68;
const SEQUENCE = [3, 0, 4, 1, 2];
const TICK_MS = 620;

export default function DifficultySelectorDotRamp() {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<HTMLButtonElement[]>([]);
  const nameRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const fill = fillRef.current;
    const nameOut = nameRef.current;
    const countOut = countRef.current;
    if (!root || !track || !fill || !nameOut || !countOut || !dotRefs.current) return undefined;
    const dots = dotRefs.current;
    if (dots.length !== LEVELS.length) return undefined;

    let selected = 1;

    // 계산 겹: 점 순서(0~4)를 초록(132°)에서 빨강(0°)으로 이어지는 색상각 값으로 바꾼다
    function dotHue(i: number) { return HUE_LOW + (HUE_HIGH - HUE_LOW) * (i / (LEVELS.length - 1)); }
    function dotColor(i: number) { return 'hsl(' + dotHue(i).toFixed(1) + ', ' + SAT + '%, ' + LIGHT + '%)'; }

    function paintUpTo(i: number) {
      dots.forEach((d, idx) => { d.style.background = idx <= i ? dotColor(idx) : ''; });
      fill!.style.width = ((i + 1) / LEVELS.length * 100) + '%';
      fill!.style.background = dotColor(i);
    }
    function commit(i: number) {
      selected = i;
      dots.forEach((d, idx) => {
        d.setAttribute('aria-checked', idx === i ? 'true' : 'false');
        d.setAttribute('tabindex', idx === i ? '0' : '-1');
      });
      paintUpTo(i);
      nameOut!.textContent = LEVELS[i];
      countOut!.textContent = (i + 1) + ' / ' + LEVELS.length;
    }
    let timer = 0;
    function human() { root!.classList.remove(styles['is-demo']); window.clearInterval(timer); }

    const offs = dots.map((d, i) => {
      function onEnter() { if (root!.classList.contains(styles['is-demo'])) return; paintUpTo(i); }
      function onLeave() { if (root!.classList.contains(styles['is-demo'])) return; paintUpTo(selected); }
      function onClick() { human(); commit(i); }
      function onKey(e: KeyboardEvent) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); human(); commit(Math.min(LEVELS.length - 1, selected + 1)); dots[selected].focus({ preventScroll: true }); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); human(); commit(Math.max(0, selected - 1)); dots[selected].focus({ preventScroll: true }); }
      }
      d.addEventListener('pointerenter', onEnter);
      d.addEventListener('pointerleave', onLeave);
      d.addEventListener('click', onClick);
      d.addEventListener('keydown', onKey);
      return () => {
        d.removeEventListener('pointerenter', onEnter);
        d.removeEventListener('pointerleave', onLeave);
        d.removeEventListener('click', onClick);
        d.removeEventListener('keydown', onKey);
      };
    });

    let si = 0;
    function tick() { commit(SEQUENCE[si % SEQUENCE.length]); si++; }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) timer = window.setInterval(tick, TICK_MS);
    commit(selected);

    return () => { offs.forEach((off) => off()); window.clearInterval(timer); };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.dr + ' ' + styles['is-demo']} ref={rootRef}>
        <div className={styles.drTrack} ref={trackRef} role="radiogroup" aria-label="난이도">
          <div className={styles.drFill} ref={fillRef} />
          {LEVELS.map((label, i) => (
            <button
              key={label}
              type="button"
              className={styles.drDot}
              ref={(el: HTMLButtonElement | null) => { if (el && dotRefs.current) dotRefs.current[i] = el; }}
              role="radio"
              aria-checked="false"
              aria-label={label}
              data-i={i}
              tabIndex={i === 0 ? 0 : -1}
            />
          ))}
        </div>
        <p className={styles.drLabel}>
          <span ref={nameRef}>보통</span> <span ref={countRef}>2 / 5</span>
        </p>
      </div>
    </main>
  );
}
