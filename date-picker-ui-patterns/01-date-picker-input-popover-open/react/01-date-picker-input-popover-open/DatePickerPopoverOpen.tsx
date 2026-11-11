import { useEffect, useRef, useState } from 'react';
import styles from './DatePickerPopoverOpen.module.scss';

type Box<T> = { current: T };

const BASE = { y: 2026, m: 3, d: 14 }; // 계산 겹 상수: 고정 오늘(월 1~12), new Date() 미사용
const ANCHOR_GAP = 8; // 계산 겹: 필드 아래 팝오버 간격(px)
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

function buildCells() {
  const n = daysInMonth(BASE.y, BASE.m);
  const lead = dow(BASE.y, BASE.m, 1);
  const cells: { key: string; d: number | null; today: boolean }[] = [];
  for (let i = 0; i < lead; i++) cells.push({ key: 'out' + i, d: null, today: false });
  for (let d = 1; d <= n; d++) cells.push({ key: 'd' + d, d, today: d === BASE.d });
  return cells;
}

export default function DatePickerPopoverOpen() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const fieldRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const popRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const [isDemo, setIsDemo] = useState(true);
  const [open, setOpen] = useState(false);
  const cells = buildCells();

  function measureAnchor() {
    // 계산 겹: 실측 위치 — 필드의 실제 렌더 폭·좌표를 읽어 팝오버를 그 자리에 앵커한다
    const field = fieldRef.current;
    const root = rootRef.current;
    const pop = popRef.current;
    if (!field || !root || !pop) return;
    const fr = field.getBoundingClientRect();
    const pr = root.getBoundingClientRect();
    pop.style.left = fr.left - pr.left + 'px';
    pop.style.top = fr.bottom - pr.top + ANCHOR_GAP + 'px';
    pop.style.width = fr.width + 'px';
  }

  function human() {
    setIsDemo(false);
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (open) measureAnchor();
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) human();
    }
    function onDoc(e: MouseEvent) {
      const root = rootRef.current;
      if (open && root && !root.contains(e.target as Node)) human();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onDoc);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onDoc);
    };
  }, [open]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isDemo || reduce) return;
    const timer = window.setInterval(() => {
      setOpen((v) => !v);
    }, 1400);
    return () => window.clearInterval(timer);
  }, [isDemo]);

  return (
    <div className={`${styles.dp} ${isDemo ? styles.isDemo : ''} ${open ? styles.dpOpen : ''}`} ref={rootRef}>
      <button
        type="button"
        className={styles.dpField}
        ref={fieldRef}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={human}
      >
        <span className={styles.dpFieldLabel}>체크인 날짜</span>
        <span className={styles.dpFieldValue}>2026-03-14</span>
      </button>
      <div className={styles.dpPop} ref={popRef} role="dialog" aria-label="달력" aria-hidden={!open}>
        <div className={styles.dpHead}><span className={styles.dpLabel}>2026년 3월</span></div>
        <div className={styles.dpWeekday} aria-hidden="true">
          {WEEKDAY.map((w) => <span key={w}>{w}</span>)}
        </div>
        <div className={styles.dpGrid}>
          {cells.map((c) => (
            <span
              key={c.key}
              className={`${styles.dpCell} ${c.d === null ? styles.dpCellOut : ''} ${c.today ? styles.dpCellToday : ''}`}
            >
              {c.d ?? ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
