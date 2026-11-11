import { useEffect, useRef } from 'react';
import styles from './BufferingProgressRing.module.scss';

const BUFFER_RING_STROKE_WIDTH = 6; // px — 변형이 6→14 로 바꾸는 값
const LOOP_MS = 2000;
const TICK_MS = 50;
const PLAY_R = 42;
const CIRC = 2 * Math.PI * PLAY_R;

function easeInOut(x: number) {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function BufferingProgressRing() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const bufferRingRef = useRef<HTMLDivElement>(null);
  const playValueRef = useRef<SVGCircleElement>(null);
  const bufferPctRef = useRef<HTMLSpanElement>(null);
  const jumpBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const bufferRing = bufferRingRef.current;
    const playValue = playValueRef.current;
    const bufferPctEl = bufferPctRef.current;
    const jumpBtn = jumpBtnRef.current;
    if (!wrap || !bufferRing || !playValue || !bufferPctEl || !jumpBtn) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    wrap.style.setProperty('--ring-w', BUFFER_RING_STROKE_WIDTH + 'px');
    playValue.style.strokeWidth = '4';
    playValue.setAttribute('stroke-dasharray', CIRC.toFixed(2));

    let manualPlay: number | null = null;

    function apply(bufferFrac: number, playFrac: number) {
      if (!bufferRing || !playValue || !bufferPctEl || !wrap) return;
      const bp = Math.round(bufferFrac * 100);
      bufferRing.style.setProperty('--buffer-pct', bp + '%');
      const offset = CIRC * (1 - playFrac);
      playValue.style.strokeDashoffset = offset.toFixed(2);
      bufferPctEl.textContent = bp + '%';
      wrap.setAttribute('aria-valuenow', String(bp));
    }

    function tick(elapsedMs: number) {
      const t = (elapsedMs % LOOP_MS) / LOOP_MS;
      const bufferFrac = lerp(0.32, 0.95, t);
      const playFrac = manualPlay !== null ? manualPlay : lerp(0.04, 0.8, easeInOut(t));
      apply(bufferFrac, Math.min(playFrac, bufferFrac));
    }

    let timer: ReturnType<typeof window.setInterval> | null = null;
    let start = 0;
    function loop() {
      tick(performance.now() - start);
    }

    function human() {
      if (wrap && wrap.classList.contains(styles['is-demo'])) {
        wrap.classList.remove(styles['is-demo']);
        if (timer !== null) window.clearInterval(timer);
        timer = null;
      }
    }

    function onJump() {
      human();
      if (!bufferRing) return;
      const bp = parseFloat(bufferRing.style.getPropertyValue('--buffer-pct')) / 100;
      manualPlay = bp;
      apply(bp, bp);
    }
    jumpBtn.addEventListener('click', onJump);

    if (!reduce) {
      start = performance.now();
      tick(0);
      timer = window.setInterval(loop, TICK_MS);
    } else {
      // reduce: 실사용 경로 — 링은 계속 진행률을 나타내야 하므로 애니메이션(전환)만 끄고 값은 정적으로 한 번 그린다
      apply(0.62, 0.4);
    }

    return () => {
      if (timer !== null) window.clearInterval(timer);
      jumpBtn.removeEventListener('click', onJump);
    };
  }, []);

  return (
    <>
      <div
        className={`${styles.ringWrap} ${styles['is-demo']}`}
        ref={wrapRef}
        role="progressbar"
        aria-label="버퍼 진행률"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
      >
        <div className={styles.bufferRing} ref={bufferRingRef} />
        <svg className={styles.playRing} viewBox="0 0 120 120" aria-hidden="true">
          <circle className={styles.playTrack} cx={60} cy={60} r={42} />
          <circle className={styles.playValue} ref={playValueRef} cx={60} cy={60} r={42} />
        </svg>
        <div className={styles.readout}>
          <span className={styles.pct} ref={bufferPctRef}>0%</span>
          <span className={styles.label}>버퍼</span>
        </div>
      </div>
      <button className={styles.jumpBtn} ref={jumpBtnRef} type="button">버퍼 끝으로 재생 이동</button>
    </>
  );
}
