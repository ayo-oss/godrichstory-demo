import { useEffect, useRef, useState } from 'react';
import styles from './GaugeBarOverhealShieldCap.module.scss';

type Box<T> = { current: T };

const HP_MAX = 100; // 상한
const OVERHEAL_CAP = 50; // 계산 겹 상수: 상한 위로 표시되는 쉴드 겹의 최대 폭 기준값
const START = 55;
const EVENTS: [number, number][] = [[300, 45], [1300, 55], [2300, -25], [3200, -15]]; // ms, 값 변화(+회복/-피해)
const DECAY_RATE = 0.00065; // 계산 겹: 상한 위 초과분이 계속 스스로 줄어드는 비율(ms 당)

export default function GaugeBarOverhealShieldCap() {
  const fillRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const shieldRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const trackRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const [isDemo, setIsDemo] = useState(true);
  const [value, setValue] = useState(START);

  const valueRef = useRef(START) as unknown as Box<number>;

  function human() {
    isDemoRef.current = false;
    setIsDemo(false);
  }

  function render() {
    const v = valueRef.current;
    const base = Math.min(v, HP_MAX);
    const excess = Math.max(0, v - HP_MAX);
    const shieldRatio = Math.min(1, excess / OVERHEAL_CAP);
    const fill = fillRef.current;
    const shield = shieldRef.current;
    const track = trackRef.current;
    if (fill) fill.style.width = base.toFixed(2) + '%';
    // 계산 겹: 초과분 폭 = 상한 위 값 / 쉴드 표시 기준값 — 반투명 겹의 폭·투명도를 함께 구동
    if (shield) {
      shield.style.width = (shieldRatio * 100).toFixed(2) + '%';
      shield.style.opacity = shieldRatio < 0.02 ? '0' : (0.4 + shieldRatio * 0.5).toFixed(3);
    }
    if (track) track.setAttribute('aria-valuenow', String(Math.round(base)));
    setValue(Math.round(v));
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
        if (elapsed >= EVENTS[EVENTS.length - 1][0] + 700) {
          cycleStart = ts; elapsed = 0; appliedIdx = 0; valueRef.current = START;
        }
        while (appliedIdx < EVENTS.length && elapsed >= EVENTS[appliedIdx][0]) {
          valueRef.current = Math.max(0, Math.min(HP_MAX + OVERHEAL_CAP, valueRef.current + EVENTS[appliedIdx][1]));
          appliedIdx++;
        }
      }

      if (valueRef.current > HP_MAX) {
        valueRef.current = HP_MAX + (valueRef.current - HP_MAX) * Math.exp(-DECAY_RATE * dt);
      }

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

  function onHeal() {
    human();
    valueRef.current = Math.max(0, Math.min(HP_MAX + OVERHEAL_CAP, valueRef.current + 30));
    render();
  }

  function onKeyDown(e: { key: string; preventDefault: () => void }) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onHeal();
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
        aria-valuenow={Math.min(value, HP_MAX)}
        ref={trackRef}
      >
        <div className={styles.gbFill} ref={fillRef} />
        <div className={styles.gbShield} ref={shieldRef} />
      </div>
      <button type="button" className={styles.gbHit} onClick={onHeal} onKeyDown={onKeyDown}>
        회복 얹기
      </button>
    </div>
  );
}
