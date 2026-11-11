import { useEffect, useState } from 'react';
import styles from './DatePickerMinMaxFade.module.scss';

const BASE = { y: 2026, m: 3, d: 14 }; // 계산 겹 상수: 고정 오늘, new Date() 미사용
const FADE_STEP = .12; // 계산 겹: 경계에서 하루 멀어질 때마다 불투명도가 이만큼 줄어든다
const FADE_FLOOR = .15; // 계산 겹: 아무리 멀어도 이 아래로는 안 내려간다
const RANGE_SEQ: [number, number][] = [[5, 20], [10, 25], [1, 12], [17, 29], [5, 20]]; // 계산 겹: 자동재생이 도는 최소·최대 순서
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

const CELL_TOTAL = 42;
const N_DAYS = daysInMonth(BASE.y, BASE.m);
const LEAD = dow(BASE.y, BASE.m, 1);
const TRAIL = CELL_TOTAL - LEAD - N_DAYS;

function fadeOf(day: number, min: number, max: number) {
  // 계산 겹: 범위 밖 각 셀은 경계로부터의 거리만큼 불투명도를 계산해 낮춘다
  const distOut = day < min ? min - day : day > max ? day - max : 0;
  return distOut === 0 ? 1 : Math.max(FADE_FLOOR, 1 - distOut * FADE_STEP);
}

export default function DatePickerMinMaxFade() {
  const [isDemo, setIsDemo] = useState(true);
  const [min, setMin] = useState(5);
  const [max, setMax] = useState(20);
  const [pickStage, setPickStage] = useState<'min' | 'max'>('min');

  function human() {
    setIsDemo(false);
  }

  function onCellClick(day: number) {
    human();
    if (pickStage === 'min') {
      setMin(day); setMax(day); setPickStage('max');
    } else if (day >= min) {
      setMax(day); setPickStage('min');
    } else {
      setMin(day); setMax(day);
    }
  }

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isDemo || reduce) return;
    let seqIdx = 0;
    const timer = window.setInterval(() => {
      seqIdx = (seqIdx + 1) % RANGE_SEQ.length;
      setMin(RANGE_SEQ[seqIdx][0]);
      setMax(RANGE_SEQ[seqIdx][1]);
    }, 700);
    return () => window.clearInterval(timer);
  }, [isDemo]);

  const lead = Array.from({ length: LEAD }, (_, i) => <span key={'l' + i} className={`${styles.mfCell} ${styles.mfCellOut}`} />);
  const days = Array.from({ length: N_DAYS }, (_, i) => {
    const d = i + 1;
    const opacity = fadeOf(d, min, max);
    const bound = d === min || d === max;
    return (
      <button
        type="button"
        key={'d' + d}
        className={`${styles.mfCell} ${bound ? styles.mfCellBound : ''} ${opacity < 1 ? styles.mfCellOutRange : ''}`}
        style={{ opacity }}
        onClick={() => onCellClick(d)}
      >
        {d}
      </button>
    );
  });

  const trail = Array.from({ length: TRAIL }, (_, i) => <span key={'t' + i} className={`${styles.mfCell} ${styles.mfCellOut}`} />);

  return (
    <div className={`${styles.mf} ${isDemo ? styles.isDemo : ''}`}>
      <div className={styles.mfHead}><span className={styles.mfLabel}>2026년 3월</span></div>
      <div className={styles.mfWeekday} aria-hidden="true">
        {WEEKDAY.map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className={styles.mfGrid}>{lead}{days}{trail}</div>
    </div>
  );
}
