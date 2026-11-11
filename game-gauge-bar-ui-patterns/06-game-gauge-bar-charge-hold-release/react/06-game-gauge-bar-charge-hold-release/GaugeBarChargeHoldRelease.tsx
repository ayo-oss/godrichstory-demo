import { useEffect, useRef, useState } from 'react';
import styles from './GaugeBarChargeHoldRelease.module.scss';

type Box<T> = { current: T };

const CHARGE_MAX = 100;
const CHARGE_RATE = 0.062; // 계산 겹 상수: ms 당 충전량
const HOLD_DUR = 1550; // ms, 자동 루프가 누르고 있는 시간
const RELEASE_DUR = 700; // ms, 방출 스프링 지속
const RELEASE_FREQ = (2 * Math.PI * 2.1) / RELEASE_DUR; // 계산 겹: 스프링 각속도
const RELEASE_ZETA = 3.6; // 계산 겹: 스프링 감쇠 상수
const PAUSE = 700;

function burstAt(t: number) {
  // 계산 겹: 방출 스프링 — 감쇠 코사인 진동으로 목표를 넘어섰다 되돌아오는 위치를 계산
  if (t < 0 || t > RELEASE_DUR) return { scale: 0, alpha: 0 };
  const x = t / RELEASE_DUR;
  const amp = Math.exp(-RELEASE_ZETA * x);
  const pos = 1 - amp * Math.cos(RELEASE_FREQ * t);
  return { scale: 1 + pos * 1.1, alpha: Math.max(0, amp * 1.15) };
}

export default function GaugeBarChargeHoldRelease() {
  const fillRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const burstRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const trackRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const [isDemo, setIsDemo] = useState(true);
  const [value, setValue] = useState(0);

  const valueRef = useRef(0) as unknown as Box<number>;
  const holdingRef = useRef(false) as unknown as Box<boolean>;
  const holdStartRef = useRef(0) as unknown as Box<number>;
  const releaseStartRef = useRef(-9999) as unknown as Box<number>;
  const releaseFromPctRef = useRef(0) as unknown as Box<number>;

  function human() {
    isDemoRef.current = false;
    setIsDemo(false);
  }

  function render(ts: number) {
    const fill = fillRef.current;
    const burst = burstRef.current;
    const track = trackRef.current;
    if (fill) fill.style.width = valueRef.current.toFixed(2) + '%';
    if (track) track.setAttribute('aria-valuenow', String(Math.round(valueRef.current)));
    setValue(Math.round(valueRef.current));
    const b = burstAt(ts - releaseStartRef.current);
    if (burst) {
      burst.style.left = releaseFromPctRef.current.toFixed(2) + '%';
      burst.style.opacity = b.alpha < 0.02 ? '0' : b.alpha.toFixed(3);
      burst.style.transform = 'translate(-50%, -50%) scale(' + b.scale.toFixed(3) + ')';
    }
  }

  function startCharge(ts: number) {
    holdingRef.current = true;
    holdStartRef.current = ts;
  }
  function releaseCharge(ts: number) {
    holdingRef.current = false;
    releaseFromPctRef.current = valueRef.current;
    releaseStartRef.current = ts;
    valueRef.current = 0;
  }

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cycleStart = 0;
    let demoPhase: 'charging' | 'released' = 'charging';
    let rafId = 0;

    function loop(ts: number) {
      if (!cycleStart) cycleStart = ts;

      if (isDemoRef.current) {
        const elapsed = ts - cycleStart;
        if (demoPhase === 'charging' && elapsed >= HOLD_DUR) {
          releaseFromPctRef.current = valueRef.current;
          releaseStartRef.current = ts;
          valueRef.current = 0;
          demoPhase = 'released';
        } else if (demoPhase === 'released' && ts - releaseStartRef.current >= RELEASE_DUR + PAUSE) {
          cycleStart = ts;
          demoPhase = 'charging';
          valueRef.current = 0;
        } else if (demoPhase === 'charging') {
          valueRef.current = Math.min(CHARGE_MAX, elapsed * CHARGE_RATE);
        }
      } else if (holdingRef.current) {
        valueRef.current = Math.min(CHARGE_MAX, (ts - holdStartRef.current) * CHARGE_RATE);
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

  function onPointerDown() {
    human();
    startCharge(performance.now());
  }
  function onPointerUp() {
    if (holdingRef.current) releaseCharge(performance.now());
  }
  function onKeyDown(e: { key: string; preventDefault: () => void }) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (!holdingRef.current) { human(); startCharge(performance.now()); }
  }
  function onKeyUp(e: { key: string }) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (holdingRef.current) releaseCharge(performance.now());
  }

  return (
    <div className={`${styles.gb} ${isDemo ? styles.isDemo : ''}`}>
      <div className={styles.gbHead}>
        <span className={styles.gbLabel}>강공격</span>
        <span className={styles.gbValue}>{value}%</span>
      </div>
      <div
        className={styles.gbTrack}
        role="progressbar"
        aria-label="충전량"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        ref={trackRef}
      >
        <div className={styles.gbFill} ref={fillRef} />
        <div className={styles.gbBurst} ref={burstRef} />
      </div>
      <button
        type="button"
        className={styles.gbHit}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      >
        누르고 있기
      </button>
    </div>
  );
}
