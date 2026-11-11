import { useEffect, useRef, useState } from 'react';
import styles from './GaugeBarDamageFlash.module.scss';

type Box<T> = { current: T };

const HP_MAX = 100;
// 계산 겹 상수: 시드 고정 전투 이벤트 배열 — [발생시각ms, 피해량]
const EVENTS: [number, number][] = [[300, 24], [1100, 18], [2000, 28], [2900, 12]];
const CYCLE = 3800; // ms, 자동 루프 한 바퀴
const LERP_RATE = 0.006; // 계산 겹: 잔상이 본값을 따라가는 지수 평활 상수(프레임 독립)
const FLASH_TAU = 70; // ms, 플래시 감쇠 시간상수
const HIT_LIST = [24, 18, 28, 12, 20]; // 클릭(실사용자) 피해량 순환

export default function GaugeBarDamageFlash() {
  const fillRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const trailRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const flashRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const trackRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const [isDemo, setIsDemo] = useState(true);
  const [value, setValue] = useState(HP_MAX);

  const mainHPRef = useRef(HP_MAX) as unknown as Box<number>;
  const trailHPRef = useRef(HP_MAX) as unknown as Box<number>;
  const flashStartRef = useRef(-9999) as unknown as Box<number>;
  const hitIdxRef = useRef(0) as unknown as Box<number>;

  function human() {
    isDemoRef.current = false;
    setIsDemo(false);
  }

  function applyHit(dmg: number, ts: number) {
    trailHPRef.current = mainHPRef.current; // 잔상은 피해 직전 값에서 출발해 뒤늦게 따라간다
    mainHPRef.current = Math.max(0, mainHPRef.current - dmg);
    flashStartRef.current = ts;
  }

  function render() {
    const mp = Math.max(0, Math.min(100, mainHPRef.current));
    const tp = Math.max(0, Math.min(100, trailHPRef.current));
    const fill = fillRef.current;
    const trail = trailRef.current;
    const track = trackRef.current;
    if (fill) fill.style.width = mp.toFixed(2) + '%';
    if (trail) trail.style.width = tp.toFixed(2) + '%';
    if (track) track.setAttribute('aria-valuenow', String(Math.round(mp)));
    setValue(Math.round(mp));
  }

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cycleStart = 0;
    let lastTs = 0;
    let appliedIdx = 0;
    let rafId = 0;

    function loop(ts: number) {
      if (!cycleStart) { cycleStart = ts; lastTs = ts; }
      const dt = ts - lastTs;
      lastTs = ts;
      let elapsed = ts - cycleStart;

      if (isDemoRef.current) {
        if (elapsed >= CYCLE) {
          cycleStart = ts;
          elapsed = 0;
          appliedIdx = 0;
          mainHPRef.current = HP_MAX;
          trailHPRef.current = HP_MAX;
          flashStartRef.current = -9999;
        }
        while (appliedIdx < EVENTS.length && elapsed >= EVENTS[appliedIdx][0]) {
          applyHit(EVENTS[appliedIdx][1], ts);
          appliedIdx++;
        }
      }

      // 계산 겹: 잔상 지수 평활 — dt(ms) 에 독립적으로 같은 반감기를 유지
      trailHPRef.current += (mainHPRef.current - trailHPRef.current) * (1 - Math.exp(-LERP_RATE * dt));
      const flash = Math.max(0, Math.exp(-(ts - flashStartRef.current) / FLASH_TAU));
      const flashEl = flashRef.current;
      if (flashEl) flashEl.style.opacity = flash < 0.02 ? '0' : flash.toFixed(3);

      render();
      rafId = requestAnimationFrame(loop);
    }

    if (!reduce) {
      rafId = requestAnimationFrame(loop);
    } else {
      render();
    }
    return () => cancelAnimationFrame(rafId);
  }, []);

  function onHit() {
    human();
    const now = performance.now();
    if (mainHPRef.current <= 0) {
      mainHPRef.current = HP_MAX;
      trailHPRef.current = HP_MAX;
      flashStartRef.current = -9999;
    } else {
      applyHit(HIT_LIST[hitIdxRef.current % HIT_LIST.length], now);
      hitIdxRef.current++;
    }
    render();
  }

  function onKeyDown(e: { key: string; preventDefault: () => void }) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onHit();
  }

  return (
    <div className={`${styles.gb} ${isDemo ? styles.isDemo : ''}`}>
      <div className={styles.gbHead}>
        <span className={styles.gbLabel}>HP</span>
        <span className={styles.gbValue}>{value} / {HP_MAX}</span>
      </div>
      <div
        className={styles.gbTrack}
        role="progressbar"
        aria-label="HP"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        ref={trackRef}
      >
        <div className={styles.gbTrail} ref={trailRef} />
        <div className={styles.gbFill} ref={fillRef} />
        <div className={styles.gbFlash} ref={flashRef} />
      </div>
      <button type="button" className={styles.gbHit} onClick={onHit} onKeyDown={onKeyDown}>
        피해 입기
      </button>
    </div>
  );
}
