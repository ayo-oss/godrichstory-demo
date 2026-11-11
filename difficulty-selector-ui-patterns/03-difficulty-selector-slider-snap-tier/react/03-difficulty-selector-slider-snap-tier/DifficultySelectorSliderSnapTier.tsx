import { useEffect, useRef } from 'react';
import styles from './DifficultySelectorSliderSnapTier.module.scss';

const LEVELS = ['쉬움', '보통', '어려움', '매우 어려움', '최고'];
const N = LEVELS.length;
const SPRING_K = 210, SPRING_D = 18, DT = 1 / 60;
const SEQUENCE = [3, 0, 4, 1, 2];
const TICK_MS = 900;

export default function DifficultySelectorSliderSnapTier() {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const fill = fillRef.current;
    const thumb = thumbRef.current;
    const label = labelRef.current;
    if (!root || !track || !fill || !thumb || !label) return undefined;

    function tierPct(t: number) { return (t / (N - 1)) * 100; }
    let tier = 1;
    let pos = tierPct(1);
    let raf = 0;

    function paintAt(pct: number) {
      thumb!.style.left = pct + '%';
      fill!.style.width = pct + '%';
    }
    function setReadout(t: number) {
      thumb!.setAttribute('aria-valuenow', String(t));
      thumb!.setAttribute('aria-valuetext', LEVELS[t]);
      label!.textContent = LEVELS[t];
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 계산 겹: 목표 단계까지 스프링-감쇠 방정식(가속도 = -k*(위치-목표) - d*속도)을 매 프레임 적분해
    // 단계를 살짝 지나쳤다가(오버슛) 되튕겨 정확히 그 단계에서 멈춘다
    function springTo(target: number) {
      cancelAnimationFrame(raf);
      if (reduce) { pos = target; paintAt(pos); return; }
      let vel = 0;
      function step() {
        const force = -SPRING_K * (pos - target) - SPRING_D * vel;
        vel += force * DT;
        pos += vel * DT;
        paintAt(pos);
        if (Math.abs(pos - target) > 0.15 || Math.abs(vel) > 0.15) raf = requestAnimationFrame(step);
        else { pos = target; paintAt(pos); }
      }
      raf = requestAnimationFrame(step);
    }
    let timer = 0;
    function human() { root!.classList.remove(styles['is-demo']); window.clearInterval(timer); }
    function settle(t: number) { tier = Math.max(0, Math.min(N - 1, t)); setReadout(tier); springTo(tierPct(tier)); }
    function pctFromX(x: number) {
      const r = track!.getBoundingClientRect();
      return Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100));
    }

    function onDown(e: PointerEvent) {
      human(); thumb!.setPointerCapture(e.pointerId); cancelAnimationFrame(raf);
      function move(ev: PointerEvent) { pos = pctFromX(ev.clientX); paintAt(pos); }
      function up() {
        thumb!.removeEventListener('pointermove', move); thumb!.removeEventListener('pointerup', up);
        settle(Math.round(pos / 100 * (N - 1)));
      }
      thumb!.addEventListener('pointermove', move);
      thumb!.addEventListener('pointerup', up);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); human(); settle(tier + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); human(); settle(tier - 1); }
      else if (e.key === 'Home') { e.preventDefault(); human(); settle(0); }
      else if (e.key === 'End') { e.preventDefault(); human(); settle(N - 1); }
    }
    thumb.addEventListener('pointerdown', onDown);
    thumb.addEventListener('keydown', onKey);

    let si = 0;
    function tick() { settle(SEQUENCE[si % SEQUENCE.length]); si++; }
    if (!reduce) timer = window.setInterval(tick, TICK_MS);
    setReadout(tier); paintAt(pos);

    return () => {
      thumb!.removeEventListener('pointerdown', onDown);
      thumb!.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.sst + ' ' + styles['is-demo']} ref={rootRef}>
        <div className={styles.sstTrack} ref={trackRef}>
          <div className={styles.sstTick} style={{ left: '0%' }} />
          <div className={styles.sstTick} style={{ left: '25%' }} />
          <div className={styles.sstTick} style={{ left: '50%' }} />
          <div className={styles.sstTick} style={{ left: '75%' }} />
          <div className={styles.sstTick} style={{ left: '100%' }} />
          <div className={styles.sstFill} ref={fillRef} />
          <button
            type="button"
            className={styles.sstThumb}
            ref={thumbRef}
            role="slider"
            aria-label="난이도"
            aria-valuemin={0}
            aria-valuemax={N - 1}
            aria-valuenow={1}
            aria-valuetext="보통"
            tabIndex={0}
          />
        </div>
        <p className={styles.sstLabel} ref={labelRef}>보통</p>
      </div>
    </main>
  );
}
