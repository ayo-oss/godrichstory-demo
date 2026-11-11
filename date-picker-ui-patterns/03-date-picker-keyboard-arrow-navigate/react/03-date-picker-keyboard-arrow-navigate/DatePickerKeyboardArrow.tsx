import { useEffect, useRef, useState } from 'react';
import styles from './DatePickerKeyboardArrow.module.scss';

type Box<T> = { current: T };

const BASE = { y: 2026, m: 3, d: 14 }; // 계산 겹 상수: 고정 오늘, new Date() 미사용
const CELL_TOTAL = 42;
const FOCUS_SEQ = [14, 15, 16, 23, 22, 21, 14]; // 계산 겹: 자동재생이 훑는 날짜 순서
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

export default function DatePickerKeyboardArrow() {
  const gridRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const ringRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const cellRefs = useRef({}) as unknown as Box<Record<number, HTMLButtonElement>>;
  const ringMeasuredRef = useRef(false) as unknown as Box<boolean>;
  const [isDemo, setIsDemo] = useState(true);
  const [focusedDay, setFocusedDay] = useState(BASE.d);

  function human() {
    setIsDemo(false);
  }

  function moveRingTo(cellEl: HTMLButtonElement) {
    // 계산 겹: 셀의 실제 렌더 좌표·크기를 실측해 링을 그 자리로 옮긴다(좌표 lerp 이동)
    const grid = gridRef.current;
    const ring = ringRef.current;
    if (!grid || !ring) return;
    const cr = cellEl.getBoundingClientRect();
    const gr = grid.getBoundingClientRect();
    if (!ringMeasuredRef.current) {
      ring.style.width = cr.width + 'px';
      ring.style.height = cr.height + 'px';
      ringMeasuredRef.current = true;
    }
    ring.style.transform = 'translate(' + (cr.left - gr.left) + 'px,' + (cr.top - gr.top) + 'px)';
  }

  function focusDay(target: number) {
    let t = target;
    if (t < 1) t = 1;
    if (t > N_DAYS) t = N_DAYS;
    setFocusedDay(t);
    const el = cellRefs.current[t];
    if (el) el.focus({ preventScroll: true });
  }

  useEffect(() => {
    const el = cellRefs.current[focusedDay];
    if (el) moveRingTo(el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedDay]);

  useEffect(() => {
    const el = cellRefs.current[BASE.d];
    if (el) el.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isDemo || reduce) return;
    let seqIdx = 0;
    const timer = window.setInterval(() => {
      seqIdx = (seqIdx + 1) % FOCUS_SEQ.length;
      focusDay(FOCUS_SEQ[seqIdx]);
    }, 500);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  function onKeyDown(e: { key: string; preventDefault: () => void }) {
    let delta = 0;
    if (e.key === 'ArrowRight') delta = 1;
    else if (e.key === 'ArrowLeft') delta = -1;
    else if (e.key === 'ArrowDown') delta = 7;
    else if (e.key === 'ArrowUp') delta = -7;
    else return;
    e.preventDefault();
    human();
    focusDay(focusedDay + delta);
  }

  const lead = Array.from({ length: LEAD }, (_, i) => <span key={'l' + i} className={`${styles.kbCell} ${styles.kbCellOut}`} />);
  const days = Array.from({ length: N_DAYS }, (_, i) => {
    const d = i + 1;
    return (
      <button
        type="button"
        key={'d' + d}
        className={styles.kbCell}
        tabIndex={d === focusedDay ? 0 : -1}
        ref={(el: HTMLButtonElement | null) => { if (el) cellRefs.current[d] = el; }}
        onClick={() => { human(); focusDay(d); }}
      >
        {d}
      </button>
    );
  });
  const trail = Array.from({ length: TRAIL }, (_, i) => <span key={'t' + i} className={`${styles.kbCell} ${styles.kbCellOut}`} />);

  return (
    <div className={`${styles.kb} ${isDemo ? styles.isDemo : ''}`}>
      <div className={styles.kbHead}><span className={styles.kbLabel}>2026년 3월</span></div>
      <div className={styles.kbWeekday} aria-hidden="true">
        {WEEKDAY.map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className={styles.kbGridWrap}>
        <div className={styles.kbRing} ref={ringRef} />
        <div className={styles.kbGrid} ref={gridRef} role="grid" aria-label="달력" onKeyDown={onKeyDown}>
          {lead}{days}{trail}
        </div>
      </div>
    </div>
  );
}
