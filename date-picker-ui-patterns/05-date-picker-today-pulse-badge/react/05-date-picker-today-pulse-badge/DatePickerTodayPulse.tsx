import { useEffect, useRef, useState } from 'react';
import styles from './DatePickerTodayPulse.module.scss';

type Box<T> = { current: T };

const BASE = { y: 2026, m: 3, d: 14 }; // 계산 겹 상수: 고정 오늘, new Date() 미사용
const CELL_TOTAL = 42;
const CYCLE = 1500; // ms, 자동재생이 펄스를 다시 트는 간격
const DUR = 1100; // ms, 감쇠 진동 한 회가 잦아드는 데 걸리는 시간
const FREQ = (2 * Math.PI * 2.3) / DUR; // 계산 겹: 진동 각속도
const ZETA = 4.2; // 계산 겹: 감쇠 상수 — 클수록 빨리 잦아든다
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

function isLeap(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}
function daysInMonth(y: number, m: number) {
  const t = [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return t[m - 1];
}
function dow(y: number, m: number, d: number) { // Zeller 합동식 — 0=일 ~ 6=토
  let yy = y;
  let mm = m;
  if (mm < 3) { yy -= 1; mm += 12; }
  const K = yy % 100;
  const J = Math.floor(yy / 100);
  let h = (d + Math.floor((13 * (mm + 1)) / 5) + K + Math.floor(K / 4) + Math.floor(J / 4) - 2 * J) % 7;
  h = ((h % 7) + 7) % 7;
  return (h + 6) % 7;
}

const N_DAYS = daysInMonth(BASE.y, BASE.m);
const LEAD = dow(BASE.y, BASE.m, 1);
const TRAIL = CELL_TOTAL - LEAD - N_DAYS;

function pulseAt(t: number) {
  // 계산 겹: 지수 감쇠 x 코사인 진동 — 스프링이 잦아드는 물리량을 그대로 계산한다
  if (t < 0 || t > DUR) return { ring: 0, ringAlpha: 0, badge: 1 };
  const x = t / DUR;
  const amp = Math.exp(-ZETA * x);
  const osc = Math.cos(FREQ * t);
  const ringScale = 1 + 1.9 * (1 - amp);
  const ringAlpha = Math.max(0, amp * .55);
  const badgeScale = 1 + .16 * amp * osc;
  return { ring: ringScale, ringAlpha, badge: badgeScale };
}

export default function DatePickerTodayPulse() {
  const ringRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const badgeRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const triggerRef = useRef(0) as unknown as Box<number>;
  const [isDemo, setIsDemo] = useState(true);

  function human() {
    isDemoRef.current = false;
    setIsDemo(false);
  }

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    let rafId = 0;
    function loop(ts: number) {
      if (!triggerRef.current) triggerRef.current = ts;
      let elapsed = ts - triggerRef.current;
      if (isDemoRef.current && elapsed > CYCLE) {
        triggerRef.current = ts;
        elapsed = 0;
      }
      const p = pulseAt(elapsed);
      const ring = ringRef.current;
      const badge = badgeRef.current;
      if (ring) {
        ring.style.transform = 'scale(' + p.ring.toFixed(3) + ')';
        ring.style.opacity = String(p.ringAlpha.toFixed(3));
      }
      if (badge) {
        badge.style.transform = 'scale(' + p.badge.toFixed(3) + ')';
      }
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  function retrigger() {
    human();
    triggerRef.current = performance.now();
  }

  function onKeyDown(e: { key: string; preventDefault: () => void }) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    retrigger();
  }

  const lead = Array.from({ length: LEAD }, (_, i) => (
    <span className={styles.tbCellWrap} key={'l' + i}><span className={styles.tbCell} /></span>
  ));
  const days = Array.from({ length: N_DAYS }, (_, i) => {
    const d = i + 1;
    if (d === BASE.d) {
      return (
        <span className={styles.tbCellWrap} key={'d' + d}>
          <span className={styles.tbRing} ref={ringRef} />
          <button
            type="button"
            className={`${styles.tbCell} ${styles.tbCellToday} ${styles.tbBadge}`}
            ref={badgeRef}
            onClick={retrigger}
            onKeyDown={onKeyDown}
          >
            {d}
          </button>
        </span>
      );
    }
    return (
      <span className={styles.tbCellWrap} key={'d' + d}><span className={styles.tbCell}>{d}</span></span>
    );
  });
  const trail = Array.from({ length: TRAIL }, (_, i) => (
    <span className={styles.tbCellWrap} key={'t' + i}><span className={styles.tbCell} /></span>
  ));

  return (
    <div className={`${styles.tb} ${isDemo ? styles.isDemo : ''}`}>
      <div className={styles.tbHead}><span className={styles.tbLabel}>2026년 3월</span></div>
      <div className={styles.tbWeekday} aria-hidden="true">
        {WEEKDAY.map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className={styles.tbGrid}>{lead}{days}{trail}</div>
    </div>
  );
}
