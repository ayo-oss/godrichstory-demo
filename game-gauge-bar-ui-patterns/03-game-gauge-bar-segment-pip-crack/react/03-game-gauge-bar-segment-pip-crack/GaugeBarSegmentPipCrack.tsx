import { useEffect, useRef, useState } from 'react';
import styles from './GaugeBarSegmentPipCrack.module.scss';

type Box<T> = { current: T };

const PIPS = 5; // 계산 겹 상수: 칸 개수
const EVENT_T = [400, 1300, 2200, 3100]; // ms, 자동 루프 안에서 칸이 깨지는 시각(PIPS-1 개)
const CRACK_DUR = 520; // ms, 한 칸이 다 깨지는 데 걸리는 시간
const STAGGER = 150; // ms, 균열 두 줄 사이 지연 — 칸 단위 stagger
const PAUSE = 500;
const CYCLE = EVENT_T[EVENT_T.length - 1] + CRACK_DUR + PAUSE;

type PipState = { c1: number; c2: number; fill: number };

export default function GaugeBarSegmentPipCrack() {
  const pipRefs = useRef(
    Array.from({ length: PIPS }, () => ({ fill: null, c1: null, c2: null }))
  ) as unknown as Box<{ fill: HTMLDivElement | null; c1: HTMLDivElement | null; c2: HTMLDivElement | null }[]>;
  const trackRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const [isDemo, setIsDemo] = useState(true);
  const [remaining, setRemaining] = useState(PIPS);

  const appliedIdxRef = useRef(0) as unknown as Box<number>;
  const eventTsRef = useRef<number[]>([]) as unknown as Box<number[]>;

  function human() {
    isDemoRef.current = false;
    setIsDemo(false);
  }

  // 칸 pipIdx 는 오른쪽부터 먼저 깨진다: eventIndex = PIPS-1-pipIdx
  function stateFor(pipIdx: number, ts: number): PipState {
    const eventIndex = PIPS - 1 - pipIdx;
    if (eventIndex < 0 || eventIndex >= appliedIdxRef.current) {
      return { c1: 0, c2: 0, fill: 1 };
    }
    const t0 = eventTsRef.current[eventIndex];
    const dt = Math.max(0, ts - t0);
    const c1 = Math.min(1, dt / (CRACK_DUR * 0.45));
    const c2 = Math.min(1, Math.max(0, dt - STAGGER) / (CRACK_DUR * 0.45));
    const fill = 1 - Math.min(1, Math.max(0, dt - STAGGER) / (CRACK_DUR - STAGGER));
    return { c1, c2, fill };
  }

  function render(ts: number) {
    for (let i = 0; i < PIPS; i++) {
      const s = stateFor(i, ts);
      const r = pipRefs.current[i];
      if (r.fill) r.fill.style.opacity = s.fill.toFixed(3);
      if (r.c1) r.c1.style.opacity = s.c1.toFixed(3);
      if (r.c2) r.c2.style.opacity = s.c2.toFixed(3);
    }
    const rem = PIPS - appliedIdxRef.current;
    const track = trackRef.current;
    if (track) track.setAttribute('aria-valuenow', String(rem));
    setRemaining(rem);
  }

  function breakOne(ts: number) {
    eventTsRef.current[appliedIdxRef.current] = ts;
    appliedIdxRef.current++;
  }

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cycleStart = 0;
    let rafId = 0;

    function loop(ts: number) {
      if (!cycleStart) cycleStart = ts;
      let elapsed = ts - cycleStart;

      if (isDemoRef.current) {
        if (elapsed >= CYCLE) {
          cycleStart = ts; elapsed = 0; appliedIdxRef.current = 0; eventTsRef.current = [];
        }
        for (let i = 0; i < EVENT_T.length; i++) {
          if (elapsed >= EVENT_T[i] && appliedIdxRef.current <= i) {
            eventTsRef.current[i] = cycleStart + EVENT_T[i];
            appliedIdxRef.current = i + 1;
          }
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

  function onBreak() {
    human();
    const now = performance.now();
    if (appliedIdxRef.current >= PIPS - 1) { appliedIdxRef.current = 0; eventTsRef.current = []; }
    else { breakOne(now); }
    render(now);
  }

  function onKeyDown(e: { key: string; preventDefault: () => void }) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onBreak();
  }

  return (
    <div className={`${styles.gb} ${isDemo ? styles.isDemo : ''}`}>
      <div className={styles.gbHead}>
        <span className={styles.gbLabel}>보스 체력</span>
        <span className={styles.gbValue}>{remaining} / {PIPS}</span>
      </div>
      <div
        className={styles.gbTrack}
        role="progressbar"
        aria-label="보스 체력"
        aria-valuemin={0}
        aria-valuemax={PIPS}
        aria-valuenow={remaining}
        ref={trackRef}
      >
        {Array.from({ length: PIPS }, (_, i) => (
          <div className={styles.gbPip} key={i}>
            <div
              className={styles.gbPipFill}
              ref={(el: HTMLDivElement | null) => { pipRefs.current[i].fill = el; }}
            />
            <div
              className={`${styles.gbCrack} ${styles.gbCrackA}`}
              ref={(el: HTMLDivElement | null) => { pipRefs.current[i].c1 = el; }}
            />
            <div
              className={`${styles.gbCrack} ${styles.gbCrackB}`}
              ref={(el: HTMLDivElement | null) => { pipRefs.current[i].c2 = el; }}
            />
          </div>
        ))}
      </div>
      <button type="button" className={styles.gbHit} onClick={onBreak} onKeyDown={onKeyDown}>
        칸 깨기
      </button>
    </div>
  );
}
