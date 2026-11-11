import { useEffect, useRef, useState } from 'react';
import styles from './GaugeBarReducedMotionInstant.module.scss';

type Box<T> = { current: T };

const HP_MAX = 100;
const START = 70;
const EVENTS: [number, number][] = [[300, -25], [1300, -15], [2400, 20], [3300, 15]]; // ms, 두 판에 동일하게 적용되는 값 변화
const LERP_RATE = 0.006; // 계산 겹: '일반' 판 잔상이 본값을 따라가는 지수 평활 상수

export default function GaugeBarReducedMotionInstant() {
  const fillNormalRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const trailNormalRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const fillReducedRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const trackNormalRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const trackReducedRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const gbRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const [isDemo, setIsDemo] = useState(true);
  const [valueNormal, setValueNormal] = useState(START);
  const [valueReduced, setValueReduced] = useState(START);

  const valueRef = useRef(START) as unknown as Box<number>;
  const trailValueRef = useRef(START) as unknown as Box<number>;
  const appliedIdxRef = useRef(0) as unknown as Box<number>;
  const cycleStartRef = useRef(0) as unknown as Box<number>;
  const lastTsRef = useRef(0) as unknown as Box<number>;

  function human() {
    isDemoRef.current = false;
    setIsDemo(false);
  }

  function render() {
    const v = Math.max(0, Math.min(100, valueRef.current));
    const tv = Math.max(0, Math.min(100, trailValueRef.current));
    const fillNormal = fillNormalRef.current;
    const trailNormal = trailNormalRef.current;
    const trackNormal = trackNormalRef.current;
    if (fillNormal) fillNormal.style.width = v.toFixed(2) + '%';
    if (trailNormal) trailNormal.style.width = tv.toFixed(2) + '%';
    if (trackNormal) trackNormal.setAttribute('aria-valuenow', String(Math.round(v)));
    setValueNormal(Math.round(v));

    // 즉시 판: 잔상·전이 없이 같은 값으로 바로 스냅 — 계산이 아니라 대입
    const fillReduced = fillReducedRef.current;
    const trackReduced = trackReducedRef.current;
    if (fillReduced) fillReduced.style.width = v.toFixed(2) + '%';
    if (trackReduced) trackReduced.setAttribute('aria-valuenow', String(Math.round(v)));
    setValueReduced(Math.round(v));
  }

  useEffect(() => {
    const systemReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;

    function loop(ts: number) {
      if (!cycleStartRef.current) { cycleStartRef.current = ts; lastTsRef.current = ts; }
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      let elapsed = ts - cycleStartRef.current;

      if (isDemoRef.current) {
        if (elapsed >= EVENTS[EVENTS.length - 1][0] + 900) {
          cycleStartRef.current = ts; elapsed = 0; appliedIdxRef.current = 0; valueRef.current = START; trailValueRef.current = START;
        }
      }
      while (appliedIdxRef.current < EVENTS.length && elapsed >= EVENTS[appliedIdxRef.current][0]) {
        trailValueRef.current = valueRef.current;
        valueRef.current = Math.max(0, Math.min(100, valueRef.current + EVENTS[appliedIdxRef.current][1]));
        appliedIdxRef.current++;
      }
      trailValueRef.current += (valueRef.current - trailValueRef.current) * (1 - Math.exp(-LERP_RATE * dt));

      render();
      rafId = requestAnimationFrame(loop);
    }

    // 시스템 모션 감소가 켜져 있어도 이 항목은 대조를 보여주는 목적이라
    // '일반' 판의 자동 루프는 계속 돈다 — 사람이 재생 버튼을 눌러도 멈추지 않는다(BD3 요구)
    rafId = requestAnimationFrame(loop);
    if (systemReduce) {
      gbRef.current?.setAttribute('data-system-reduce', 'true');
    }
    return () => cancelAnimationFrame(rafId);
  }, []);

  function onReplay() {
    human();
    cycleStartRef.current = 0; appliedIdxRef.current = 0; valueRef.current = START; trailValueRef.current = START;
  }

  function onKeyDown(e: { key: string; preventDefault: () => void }) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onReplay();
  }

  return (
    <div className={`${styles.gb} ${isDemo ? styles.isDemo : ''}`} ref={gbRef}>
      <div className={styles.gbPair}>
        <div className={styles.gbCol}>
          <span className={styles.gbColLabel}>일반</span>
          <div
            className={styles.gbTrack}
            role="progressbar"
            aria-label="HP 일반"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={valueNormal}
            ref={trackNormalRef}
          >
            <div className={styles.gbTrail} ref={trailNormalRef} />
            <div className={styles.gbFill} ref={fillNormalRef} />
          </div>
          <span className={styles.gbValue}>{valueNormal}</span>
        </div>
        <div className={styles.gbCol}>
          <span className={styles.gbColLabel}>모션 감소</span>
          <div
            className={styles.gbTrack}
            role="progressbar"
            aria-label="HP 모션 감소"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={valueReduced}
            ref={trackReducedRef}
          >
            <div className={`${styles.gbFill} ${styles.gbFillInstant}`} ref={fillReducedRef} />
          </div>
          <span className={styles.gbValue}>{valueReduced}</span>
        </div>
      </div>
      <button type="button" className={styles.gbHit} onClick={onReplay} onKeyDown={onKeyDown}>
        피해·회복 재생
      </button>
    </div>
  );
}
