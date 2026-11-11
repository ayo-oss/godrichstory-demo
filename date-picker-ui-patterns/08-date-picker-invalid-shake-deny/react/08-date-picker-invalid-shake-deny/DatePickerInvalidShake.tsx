import { useEffect, useRef, useState } from 'react';
import styles from './DatePickerInvalidShake.module.scss';

type Box<T> = { current: T };

const BASE = { y: 2026, m: 3, d: 14 }; // 계산 겹 상수: 고정 오늘, new Date() 미사용
const CELL_TOTAL = 42;
const SHAKE_DUR = 420; // ms, 계산 겹: 감쇠 진동이 잦아드는 데 걸리는 시간
const SHAKE_FREQ = (2 * Math.PI * 3.4) / SHAKE_DUR; // 계산 겹: 흔들림 각속도
const SHAKE_ZETA = 6.5; // 계산 겹: 감쇠 상수
const SHAKE_AMP = 8; // px, 흔들림 최대 진폭
const BANNER_MS = 900; // ms, 거부 배너가 떠 있는 시간
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
function isWeekend(y: number, m: number, d: number) {
  const w = dow(y, m, d);
  return w === 0 || w === 6;
}

const N_DAYS = daysInMonth(BASE.y, BASE.m);
const LEAD = dow(BASE.y, BASE.m, 1);
const TRAIL = CELL_TOTAL - LEAD - N_DAYS;
const INVALID_DAYS: number[] = [];
for (let d = 1; d <= N_DAYS; d++) if (isWeekend(BASE.y, BASE.m, d)) INVALID_DAYS.push(d);

function shakeAt(t: number) {
  // 계산 겹: 지수 감쇠 x 코사인 진동을 픽셀 오프셋으로 바꾼다
  if (t < 0 || t > SHAKE_DUR) return 0;
  const x = t / SHAKE_DUR;
  const amp = Math.exp(-SHAKE_ZETA * x);
  return SHAKE_AMP * amp * Math.cos(SHAKE_FREQ * t);
}

export default function DatePickerInvalidShake() {
  const cellRefs = useRef({}) as unknown as Box<Record<number, HTMLButtonElement>>;
  const shakeTargetRef = useRef(0) as unknown as Box<number>;
  const shakeStartRef = useRef(0) as unknown as Box<number>;
  const bannerTimerRef = useRef(0) as unknown as Box<number>;
  const [isDemo, setIsDemo] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [bannerShow, setBannerShow] = useState(false);

  function human() {
    setIsDemo(false);
  }

  function showBanner() {
    setBannerShow(true);
    window.clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = window.setTimeout(() => setBannerShow(false), BANNER_MS);
  }

  function reject(day: number, ts: number) {
    shakeTargetRef.current = day;
    shakeStartRef.current = ts;
    showBanner();
  }

  function onCellClick(day: number, invalid: boolean) {
    human();
    if (invalid) {
      reject(day, performance.now());
    } else {
      setSelected(day);
    }
  }

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    let rafId = 0;
    function loop(ts: number) {
      const day = shakeTargetRef.current;
      if (day) {
        const elapsed = ts - shakeStartRef.current;
        const el = cellRefs.current[day];
        if (el) {
          if (elapsed > SHAKE_DUR) {
            el.style.transform = '';
            shakeTargetRef.current = 0;
          } else {
            el.style.transform = 'translateX(' + shakeAt(elapsed).toFixed(2) + 'px)';
          }
        }
      }
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    let seqIdx = -1;
    const timer = window.setInterval(() => {
      if (!isDemo) return;
      seqIdx = (seqIdx + 1) % INVALID_DAYS.length;
      reject(INVALID_DAYS[seqIdx], performance.now());
    }, 480);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  const lead = Array.from({ length: LEAD }, (_, i) => <span key={'l' + i} className={`${styles.kdCell} ${styles.kdCellOut}`} />);
  const days = Array.from({ length: N_DAYS }, (_, i) => {
    const d = i + 1;
    const invalid = isWeekend(BASE.y, BASE.m, d);
    return (
      <button
        type="button"
        key={'d' + d}
        className={`${styles.kdCell} ${invalid ? styles.kdCellInvalid : ''} ${selected === d ? styles.kdCellSelected : ''}`}
        ref={(el: HTMLButtonElement | null) => { if (el) cellRefs.current[d] = el; }}
        onClick={() => onCellClick(d, invalid)}
      >
        {d}
      </button>
    );
  });
  const trail = Array.from({ length: TRAIL }, (_, i) => <span key={'t' + i} className={`${styles.kdCell} ${styles.kdCellOut}`} />);

  return (
    <div className={`${styles.kd} ${isDemo ? styles.isDemo : ''}`}>
      <div className={styles.kdHead}><span className={styles.kdLabel}>2026년 3월</span></div>
      <div className={styles.kdWeekday} aria-hidden="true">
        {WEEKDAY.map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className={styles.kdGrid}>{lead}{days}{trail}</div>
      <div className={`${styles.kdBanner} ${bannerShow ? styles.kdBannerShow : ''}`}>주말은 선택할 수 없어요</div>
    </div>
  );
}
