import { useEffect, useRef, useState } from 'react';
import styles from './GaugeBarStaggerBreakSnap.module.scss';

type Box<T> = { current: T };

const STAGGER_MAX = 100;
const BUILD_EVENTS: [number, number][] = [[300, 35], [1000, 30], [1700, 40]]; // ms, 자동 루프에서 기절치가 쌓이는 이벤트
const SPIKE_DUR = 130; // ms, 상한 도달 직후 불투명도가 튀는 구간
const DROP_DUR = 330; // ms, 그 뒤 0 으로 떨어지는 구간
const RECOVER_DUR = 950; // ms, 붕괴 후 다시 채워지는 구간
const PAUSE = 450;

function snapOpacity(dt: number) {
  // 계산 겹: 상한에 닿는 순간 불투명도가 짧게 튀었다가(스파이크) 감쇠 없이 선형으로 0까지 떨어진다
  if (dt < SPIKE_DUR) return 1;
  if (dt < SPIKE_DUR + DROP_DUR) return 1 - (dt - SPIKE_DUR) / DROP_DUR;
  return 0;
}

export default function GaugeBarStaggerBreakSnap() {
  const fillRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const trackRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const [isDemo, setIsDemo] = useState(true);
  const [pct, setPct] = useState(0);

  const valueRef = useRef(0) as unknown as Box<number>;
  const phaseRef = useRef<'build' | 'snap' | 'recover'>('build') as unknown as Box<'build' | 'snap' | 'recover'>;
  const phaseStartRef = useRef(0) as unknown as Box<number>;
  const hitIdxRef = useRef(0) as unknown as Box<number>;

  function human() {
    isDemoRef.current = false;
    setIsDemo(false);
  }

  function render(ts: number) {
    const dtPhase = ts - phaseStartRef.current;
    let opacity = 1;
    let width = valueRef.current;
    let shake = 0;

    if (phaseRef.current === 'snap') {
      opacity = snapOpacity(dtPhase);
      shake = dtPhase < SPIKE_DUR ? Math.sin(dtPhase * 0.9) * 4 : 0;
      width = STAGGER_MAX;
    } else if (phaseRef.current === 'recover') {
      const r = Math.min(1, dtPhase / RECOVER_DUR);
      opacity = r;
      width = r * STAGGER_MAX * 0.9; // 계산 겹: 회복은 상한 근처(90%)까지만, 다음 타격이 마저 채운다
      valueRef.current = width;
    }

    const fill = fillRef.current;
    const track = trackRef.current;
    const clampedWidth = Math.max(0, Math.min(100, width));
    if (fill) {
      fill.style.width = clampedWidth.toFixed(2) + '%';
      fill.style.opacity = Math.max(0, Math.min(1, opacity)).toFixed(3);
      fill.style.transform = 'translateX(' + shake.toFixed(2) + 'px)';
    }
    const shown = Math.round(clampedWidth);
    if (track) track.setAttribute('aria-valuenow', String(shown));
    setPct(shown);
  }

  function triggerSnap(ts: number) {
    phaseRef.current = 'snap';
    phaseStartRef.current = ts;
  }

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cycleStart = 0;
    let appliedIdx = 0;
    let rafId = 0;

    function loop(ts: number) {
      if (!cycleStart) { cycleStart = ts; phaseStartRef.current = ts; }

      if (isDemoRef.current) {
        const elapsed = ts - cycleStart;
        if (phaseRef.current === 'build') {
          while (appliedIdx < BUILD_EVENTS.length && elapsed >= BUILD_EVENTS[appliedIdx][0]) {
            valueRef.current = Math.min(STAGGER_MAX, valueRef.current + BUILD_EVENTS[appliedIdx][1]);
            appliedIdx++;
            if (valueRef.current >= STAGGER_MAX) triggerSnap(ts);
          }
        } else if (phaseRef.current === 'snap' && ts - phaseStartRef.current >= SPIKE_DUR + DROP_DUR) {
          phaseRef.current = 'recover'; phaseStartRef.current = ts;
        } else if (phaseRef.current === 'recover' && ts - phaseStartRef.current >= RECOVER_DUR + PAUSE) {
          cycleStart = ts; phaseStartRef.current = ts; phaseRef.current = 'build'; appliedIdx = 0; valueRef.current = 0;
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

  function onPoise() {
    human();
    const now = performance.now();
    if (phaseRef.current === 'build') {
      valueRef.current = Math.min(STAGGER_MAX, valueRef.current + [35, 30, 40, 35][hitIdxRef.current % 4]);
      hitIdxRef.current++;
      if (valueRef.current >= STAGGER_MAX) triggerSnap(now);
    } else if (phaseRef.current === 'snap') {
      // 스냅 도중엔 무시 — 붕괴가 끝나야 다시 쌓인다
    } else {
      phaseRef.current = 'build'; valueRef.current = 0; hitIdxRef.current = 0;
    }
  }

  function onKeyDown(e: { key: string; preventDefault: () => void }) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onPoise();
  }

  return (
    <div className={`${styles.gb} ${isDemo ? styles.isDemo : ''}`}>
      <div className={styles.gbHead}>
        <span className={styles.gbLabel}>기절치</span>
        <span className={styles.gbValue}>{pct}%</span>
      </div>
      <div
        className={styles.gbTrack}
        role="progressbar"
        aria-label="기절치"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        ref={trackRef}
      >
        <div className={styles.gbFill} ref={fillRef} />
      </div>
      <button type="button" className={styles.gbHit} onClick={onPoise} onKeyDown={onKeyDown}>
        기절치 쌓기
      </button>
    </div>
  );
}
