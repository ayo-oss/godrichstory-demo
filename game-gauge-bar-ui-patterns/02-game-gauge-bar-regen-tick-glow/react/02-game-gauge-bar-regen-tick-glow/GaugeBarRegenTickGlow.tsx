import { useEffect, useRef, useState } from 'react';
import styles from './GaugeBarRegenTickGlow.module.scss';

type Box<T> = { current: T };

const RES_MAX = 100;
const START = 30; // 계산 겹 상수: 회복 시작값
const TICK_INTERVAL = 340; // ms, 자동 루프의 틱 간격
const TICK_AMOUNT = 7; // 틱마다 오르는 값
const GLOW_TAU = 150; // ms, 글로우 감쇠 시간상수
const PAUSE = 500; // ms, 가득 찬 뒤 다음 루프 전 대기
const TICK_COUNT = Math.ceil((RES_MAX - START) / TICK_AMOUNT); // 계산 겹: 간격에서 파생
const CYCLE = TICK_COUNT * TICK_INTERVAL + PAUSE;

export default function GaugeBarRegenTickGlow() {
  const fillRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const edgeRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const trackRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const [isDemo, setIsDemo] = useState(true);
  const [value, setValue] = useState(START);

  const valueRef = useRef(START) as unknown as Box<number>;
  const glowStartRef = useRef(-9999) as unknown as Box<number>;

  function human() {
    isDemoRef.current = false;
    setIsDemo(false);
  }

  function tick(ts: number) {
    valueRef.current = Math.min(RES_MAX, valueRef.current + TICK_AMOUNT);
    glowStartRef.current = ts;
  }

  function render(glow: number) {
    const v = Math.max(0, Math.min(RES_MAX, valueRef.current));
    const fill = fillRef.current;
    const edge = edgeRef.current;
    const track = trackRef.current;
    const g = glow < 0.02 ? 0 : glow;
    if (fill) fill.style.width = v.toFixed(2) + '%';
    if (edge) {
      edge.style.left = v.toFixed(2) + '%';
      // 계산 겹: 글로우 값이 밝기·번짐 두 CSS 값을 동시에 구동한다
      edge.style.opacity = (0.35 + g * 0.65).toFixed(3);
      edge.style.transform = 'translate(-50%, -50%) scale(' + (1 + g * 0.9).toFixed(3) + ')';
    }
    if (track) track.setAttribute('aria-valuenow', String(Math.round(v)));
    setValue(Math.round(v));
  }

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cycleStart = 0;
    let lastTickIdx = -1;
    let rafId = 0;

    function loop(ts: number) {
      if (!cycleStart) cycleStart = ts;
      let elapsed = ts - cycleStart;

      if (isDemoRef.current) {
        if (elapsed >= CYCLE) {
          cycleStart = ts; elapsed = 0; valueRef.current = START; lastTickIdx = -1;
        }
        const idx = Math.floor(elapsed / TICK_INTERVAL);
        if (idx > lastTickIdx && idx < TICK_COUNT) {
          lastTickIdx = idx;
          tick(ts);
        }
      }

      const glow = Math.max(0, Math.exp(-(ts - glowStartRef.current) / GLOW_TAU));
      render(glow);
      rafId = requestAnimationFrame(loop);
    }

    if (!reduce) {
      rafId = requestAnimationFrame(loop);
    } else {
      render(0);
    }
    return () => cancelAnimationFrame(rafId);
  }, []);

  function onTick() {
    human();
    if (valueRef.current >= RES_MAX) { valueRef.current = START; }
    else { tick(performance.now()); }
    render(1);
  }

  function onKeyDown(e: { key: string; preventDefault: () => void }) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onTick();
  }

  return (
    <div className={`${styles.gb} ${isDemo ? styles.isDemo : ''}`}>
      <div className={styles.gbHead}>
        <span className={styles.gbLabel}>MP</span>
        <span className={styles.gbValue}>{value} / {RES_MAX}</span>
      </div>
      <div
        className={styles.gbTrack}
        role="progressbar"
        aria-label="MP"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        ref={trackRef}
      >
        <div className={styles.gbFill} ref={fillRef} />
        <div className={styles.gbEdge} ref={edgeRef} />
      </div>
      <button type="button" className={styles.gbHit} onClick={onTick} onKeyDown={onKeyDown}>
        회복 틱 넣기
      </button>
    </div>
  );
}
