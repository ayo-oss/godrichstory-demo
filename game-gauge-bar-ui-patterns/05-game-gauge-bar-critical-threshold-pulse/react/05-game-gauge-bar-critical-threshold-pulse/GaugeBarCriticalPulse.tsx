import { useEffect, useRef, useState } from 'react';
import styles from './GaugeBarCriticalPulse.module.scss';

type Box<T> = { current: T };

const HP_MAX = 100;
const THRESHOLD = 30; // 계산 겹 상수: 위험 구간 진입 기준
const START = 70;
const EVENTS: [number, number][] = [[400, -20], [1400, -15], [2200, -10], [3000, -15]]; // ms, 값 변화
const PERIOD_MAX = 900; // ms, 임계 진입 직후(잔량 많음) 박동 주기
const PERIOD_MIN = 280; // ms, 잔량 0 에 가까울 때 박동 주기
const AMP_MIN = 0.12; // 임계 진입 직후 박동 진폭
const AMP_MAX = 0.5; // 잔량 0 에 가까울 때 박동 진폭
const HIT_LIST = [20, 15, 10, 15, 20];

function pulseFor(v: number, ts: number) {
  if (v >= THRESHOLD) return { brightness: 1, glow: 0 };
  // 계산 겹: 잔량이 낮을수록 박동 주기는 짧아지고 진폭은 커진다(반비례) — 매 프레임 v 에서 다시 계산
  const ratio = (THRESHOLD - v) / THRESHOLD; // 0..1
  const period = PERIOD_MAX - (PERIOD_MAX - PERIOD_MIN) * ratio;
  const amp = AMP_MIN + (AMP_MAX - AMP_MIN) * ratio;
  const phase = ((ts % period) / period) * Math.PI * 2;
  const osc = Math.sin(phase);
  return { brightness: 1 + amp * osc, glow: Math.max(0, osc) * amp };
}

export default function GaugeBarCriticalPulse() {
  const fillRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const trackRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const [isDemo, setIsDemo] = useState(true);
  const [value, setValue] = useState(START);

  const valueRef = useRef(START) as unknown as Box<number>;
  const hitIdxRef = useRef(0) as unknown as Box<number>;

  function human() {
    isDemoRef.current = false;
    setIsDemo(false);
  }

  function render(ts: number) {
    const v = Math.max(0, Math.min(HP_MAX, valueRef.current));
    const fill = fillRef.current;
    const track = trackRef.current;
    if (fill) {
      fill.style.width = v.toFixed(2) + '%';
      const p = pulseFor(v, ts);
      fill.style.filter = 'brightness(' + p.brightness.toFixed(3) + ')';
      fill.style.boxShadow = p.glow > 0.02
        ? '0 0 ' + (6 + p.glow * 18).toFixed(1) + 'px ' + (p.glow * 6).toFixed(1) + 'px rgba(255,120,90,' + p.glow.toFixed(3) + ')'
        : 'none';
    }
    if (track) track.setAttribute('aria-valuenow', String(Math.round(v)));
    setValue(Math.round(v));
  }

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cycleStart = 0;
    let appliedIdx = 0;
    let rafId = 0;

    function loop(ts: number) {
      if (!cycleStart) cycleStart = ts;
      let elapsed = ts - cycleStart;

      if (isDemoRef.current) {
        if (elapsed >= EVENTS[EVENTS.length - 1][0] + 1000) {
          cycleStart = ts; elapsed = 0; appliedIdx = 0; valueRef.current = START;
        }
        while (appliedIdx < EVENTS.length && elapsed >= EVENTS[appliedIdx][0]) {
          valueRef.current = Math.max(0, Math.min(HP_MAX, valueRef.current + EVENTS[appliedIdx][1]));
          appliedIdx++;
        }
      }

      render(ts);
      rafId = requestAnimationFrame(loop);
    }

    if (!reduce) {
      rafId = requestAnimationFrame(loop);
    } else {
      render(0);
    }
    return () => cancelAnimationFrame(rafId);
  }, []);

  function onHit() {
    human();
    if (valueRef.current <= 0) { valueRef.current = START; }
    else { valueRef.current = Math.max(0, valueRef.current - HIT_LIST[hitIdxRef.current % HIT_LIST.length]); hitIdxRef.current++; }
    render(performance.now());
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
        <div className={styles.gbFill} ref={fillRef} />
      </div>
      <button type="button" className={styles.gbHit} onClick={onHit} onKeyDown={onKeyDown}>
        피해 입기
      </button>
    </div>
  );
}
