import { useEffect, useRef } from 'react';
import styles from './DifficultySelectorBarMeterFill.module.scss';

const LEVELS = ['쉬움', '보통', '어려움', '매우 어려움', '최고'];
const N = LEVELS.length;
const SWEEP_MS = 480;
const SEQUENCE = [4, 1, 3, 0, 2];
const TICK_MS = 900;

export default function DifficultySelectorBarMeterFill() {
  const rootRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const glossRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const plusRef = useRef<HTMLButtonElement>(null);
  const minusRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const meter = meterRef.current;
    const fill = fillRef.current;
    const gloss = glossRef.current;
    const name = nameRef.current;
    const plus = plusRef.current;
    const minus = minusRef.current;
    if (!root || !meter || !fill || !gloss || !name || !plus || !minus) return undefined;

    let tier = 2;
    let raf = 0, t0 = 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
    // 계산 겹: 채움이 바뀔 때마다 밝은 띠의 위치를 easeOutCubic(경과비율) 로 매 프레임 계산해 왼쪽에서 오른쪽으로 훑는다
    function sweep() {
      cancelAnimationFrame(raf);
      if (reduce) { gloss!.style.opacity = '0'; return; }
      t0 = performance.now();
      gloss!.style.opacity = '1';
      function step(now: number) {
        const t = Math.min(1, (now - t0) / SWEEP_MS);
        gloss!.style.left = (easeOutCubic(t) * 100) + '%';
        if (t < 1) raf = requestAnimationFrame(step);
        else gloss!.style.opacity = '0';
      }
      raf = requestAnimationFrame(step);
    }
    function paint() {
      fill!.style.width = ((tier + 1) / N * 100) + '%';
      meter!.setAttribute('aria-valuenow', String(tier));
      meter!.setAttribute('aria-valuetext', LEVELS[tier]);
      name!.textContent = LEVELS[tier];
    }
    let timer = 0;
    function human() { root!.classList.remove(styles['is-demo']); window.clearInterval(timer); }
    function set(t: number) {
      const next = Math.max(0, Math.min(N - 1, t));
      if (next === tier) return;
      tier = next; paint(); sweep();
    }

    function onPlus() { human(); set(tier + 1); }
    function onMinus() { human(); set(tier - 1); }
    function onDown(e: PointerEvent) {
      human();
      const r = meter!.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      set(Math.round(ratio * (N - 1)));
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); human(); set(tier + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); human(); set(tier - 1); }
    }
    plus.addEventListener('click', onPlus);
    minus.addEventListener('click', onMinus);
    meter.addEventListener('pointerdown', onDown);
    meter.addEventListener('keydown', onKey);

    let si = 0;
    function tick() {
      const t = SEQUENCE[si % SEQUENCE.length]; si++;
      tier = t; paint(); sweep();
    }
    if (!reduce) timer = window.setInterval(tick, TICK_MS);
    paint();

    return () => {
      plus!.removeEventListener('click', onPlus);
      minus!.removeEventListener('click', onMinus);
      meter!.removeEventListener('pointerdown', onDown);
      meter!.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.bmf + ' ' + styles['is-demo']} ref={rootRef}>
        <div
          className={styles.bmfMeter}
          ref={meterRef}
          role="slider"
          tabIndex={0}
          aria-label="난이도"
          aria-valuemin={0}
          aria-valuemax={N - 1}
          aria-valuenow={2}
          aria-valuetext="어려움"
        >
          <div className={styles.bmfFill} ref={fillRef} />
          <div className={styles.bmfGloss} ref={glossRef} />
        </div>
        <div className={styles.bmfRow}>
          <button type="button" className={styles.bmfBtn} ref={minusRef} aria-label="난이도 낮추기">−</button>
          <span className={styles.bmfName} ref={nameRef}>어려움</span>
          <button type="button" className={styles.bmfBtn} ref={plusRef} aria-label="난이도 높이기">+</button>
        </div>
      </div>
    </main>
  );
}
