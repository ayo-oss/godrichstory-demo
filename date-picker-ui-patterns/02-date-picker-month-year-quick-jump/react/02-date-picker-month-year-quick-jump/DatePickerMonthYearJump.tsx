import { useEffect, useRef, useState } from 'react';
import styles from './DatePickerMonthYearJump.module.scss';

type Box<T> = { current: T };

const YEAR = 2026; // 계산 겹 상수: 연도 고정, new Date() 미사용
const MONTH_LABEL = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const HEADER_LABEL = [
  '2026년 1월', '2026년 2월', '2026년 3월', '2026년 4월', '2026년 5월', '2026년 6월',
  '2026년 7월', '2026년 8월', '2026년 9월', '2026년 10월', '2026년 11월', '2026년 12월',
];
const AUTO_SEQ = [3, 7, 11, 3]; // 계산 겹: 자동재생이 도는 목표 월 순서, 오프셋 부호로 슬라이드 방향을 정한다
const CELL_TOTAL = 42; // 계산 겹: 6행 고정 — 월마다 칸 수가 달라도 뷰포트 높이가 흔들리지 않는다

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

function buildCells(m: number) {
  const n = daysInMonth(YEAR, m);
  const lead = dow(YEAR, m, 1);
  const trail = CELL_TOTAL - lead - n;
  const cells: { key: string; d: number | null }[] = [];
  for (let i = 0; i < lead; i++) cells.push({ key: 'l' + i, d: null });
  for (let d = 1; d <= n; d++) cells.push({ key: 'd' + d, d });
  for (let i = 0; i < trail; i++) cells.push({ key: 't' + i, d: null });
  return cells;
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

export default function DatePickerMonthYearJump() {
  const viewportRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const gridRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const [isDemo, setIsDemo] = useState(true);
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [current, setCurrent] = useState(3);
  const seqIdxRef = useRef(0) as unknown as Box<number>;

  function human() {
    setIsDemo(false);
  }

  function slideTo(target: number) {
    // 계산 겹: 뷰포트 실측 폭을 슬라이드 거리로, 목표-현재 월 오프셋 부호를 슬라이드 방향으로 쓴다
    const viewport = viewportRef.current;
    const grid = gridRef.current;
    if (!viewport || !grid) { setCurrent(target); setMode('month'); return; }
    const dist = viewport.getBoundingClientRect().width;
    const dir = target >= current ? 1 : -1;
    setCurrent(target);
    setMode('month');
    grid.style.transition = 'none';
    grid.style.transform = 'translateX(' + dir * dist + 'px)';
    void grid.offsetWidth;
    grid.style.transition = '';
    grid.style.transform = 'translateX(0)';
  }

  function stepMonth(delta: number) {
    let target = current + delta;
    if (target < 1) target = 12;
    if (target > 12) target = 1;
    slideTo(target);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') { human(); stepMonth(-1); }
      if (e.key === 'ArrowRight') { human(); stepMonth(1); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isDemo || reduce) return;
    const timer = window.setInterval(() => {
      seqIdxRef.current = (seqIdxRef.current + 1) % AUTO_SEQ.length;
      slideTo(AUTO_SEQ[seqIdxRef.current]);
    }, 480);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  const cells = buildCells(current);

  return (
    <div className={`${styles.mj} ${isDemo ? styles.isDemo : ''} ${mode === 'year' ? styles.mjYear : ''}`}>
      <div className={styles.mjBar}>
        <button type="button" className={styles.mjNav} aria-label="이전 달" onClick={() => { human(); stepMonth(-1); }}>‹</button>
        <button
          type="button"
          className={styles.mjHead}
          onClick={() => { human(); setMode((v) => (v === 'year' ? 'month' : 'year')); }}
        >
          {HEADER_LABEL[current - 1]}
        </button>
        <button type="button" className={styles.mjNav} aria-label="다음 달" onClick={() => { human(); stepMonth(1); }}>›</button>
      </div>
      <div className={styles.mjWeekday} aria-hidden="true">
        {WEEKDAY.map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className={styles.mjViewport} ref={viewportRef}>
        <div className={styles.mjGrid} ref={gridRef}>
          {cells.map((c) => (
            <span key={c.key} className={`${styles.mjCell} ${c.d === null ? styles.mjCellOut : ''}`}>{c.d ?? ''}</span>
          ))}
        </div>
      </div>
      <div className={styles.mjYearGrid}>
        {MONTH_LABEL.map((label, i) => (
          <button
            type="button"
            key={label}
            className={`${styles.mjYcell} ${i + 1 === current ? styles.mjYcellNow : ''}`}
            onClick={() => { human(); slideTo(i + 1); }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
