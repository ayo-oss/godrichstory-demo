import { useEffect, useRef, useState } from 'react';
import styles from './DatePickerPresetChips.module.scss';

type Box<T> = { current: T };

const BASE = { y: 2026, m: 3, d: 14 }; // 계산 겹 상수: 고정 오늘, new Date() 미사용
const CELL_TOTAL = 42;
const STAGGER = 28; // ms, 계산 겹: 범위 시작에서 이 셀까지의 위치 x STAGGER = 전환 지연
const PRESETS: { id: string; label: string; start: number; end: number }[] = [
  { id: 'week', label: '이번 주', start: 8, end: 14 },
  { id: 'next7', label: '다음 7일', start: 14, end: 20 },
  { id: 'month', label: '이번 달', start: 1, end: 31 },
];
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

function delayOf(day: number, presetIdx: number) {
  // 계산 겹: 선택 범위 시작으로부터의 위치(pos)만큼 전환 지연을 매겨 순차 채움을 만든다
  const p = PRESETS[presetIdx];
  if (day < p.start || day > p.end) return 0;
  return (day - p.start) * STAGGER;
}
function inRangeOf(day: number, presetIdx: number) {
  const p = PRESETS[presetIdx];
  return day >= p.start && day <= p.end;
}

export default function DatePickerPresetChips() {
  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const [isDemo, setIsDemo] = useState(true);
  const [presetIdx, setPresetIdx] = useState(0);

  function human() {
    isDemoRef.current = false;
    setIsDemo(false);
  }

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    let seqIdx = 0;
    const timer = window.setInterval(() => {
      if (!isDemoRef.current) return;
      seqIdx = (seqIdx + 1) % PRESETS.length;
      setPresetIdx(seqIdx);
    }, 650);
    return () => window.clearInterval(timer);
  }, []);

  function pickPreset(idx: number) {
    human();
    setPresetIdx(idx);
  }

  const lead = Array.from({ length: LEAD }, (_, i) => <span key={'l' + i} className={`${styles.psCell} ${styles.psCellOut}`} />);
  const days = Array.from({ length: N_DAYS }, (_, i) => {
    const d = i + 1;
    const on = inRangeOf(d, presetIdx);
    return (
      <span
        key={'d' + d}
        className={`${styles.psCell} ${on ? styles.psCellOn : ''}`}
        style={{ transitionDelay: delayOf(d, presetIdx) + 'ms' }}
      >
        {d}
      </span>
    );
  });
  const trail = Array.from({ length: TRAIL }, (_, i) => <span key={'t' + i} className={`${styles.psCell} ${styles.psCellOut}`} />);

  return (
    <div className={`${styles.ps} ${isDemo ? styles.isDemo : ''}`}>
      <div className={styles.psChips}>
        {PRESETS.map((p, idx) => (
          <button
            type="button"
            key={p.id}
            className={`${styles.psChip} ${idx === presetIdx ? styles.psChipActive : ''}`}
            onClick={() => pickPreset(idx)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className={styles.psHead}><span className={styles.psLabel}>2026년 3월</span></div>
      <div className={styles.psWeekday} aria-hidden="true">
        {WEEKDAY.map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className={styles.psGrid}>{lead}{days}{trail}</div>
    </div>
  );
}
