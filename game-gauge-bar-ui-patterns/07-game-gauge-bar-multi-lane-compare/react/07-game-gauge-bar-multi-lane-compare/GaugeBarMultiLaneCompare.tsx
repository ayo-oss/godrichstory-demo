import { useEffect, useRef, useState } from 'react';
import styles from './GaugeBarMultiLaneCompare.module.scss';

type Box<T> = { current: T };

// 계산 겹 상수: 레인마다 다른 위상·주파수의 사인 궤적 — 시드 고정, Math.random 미사용
type Lane = { label: string; base: number; amp: number; freq: number; phase: number; offset: number };
const LANES_INIT: Lane[] = [
  { label: 'A', base: 55, amp: 22, freq: 0.55, phase: 0.0, offset: 0 },
  { label: 'B', base: 60, amp: 18, freq: 0.70, phase: 1.3, offset: 0 },
  { label: 'C', base: 45, amp: 25, freq: 0.40, phase: 2.8, offset: 0 },
  { label: 'D', base: 50, amp: 20, freq: 0.62, phase: 4.1, offset: 0 },
];
const JOLTS = [
  [0, 0, 20, 0],
  [-15, 0, 0, 18],
  [0, 22, -10, 0],
  [16, -12, 0, 0],
]; // 클릭마다 순환 적용되는 레인별 고정 오프셋 증가량

function valuesAt(lanes: Lane[], t: number) {
  return lanes.map((l) => {
    const v = l.base + l.offset + l.amp * Math.sin((l.freq * t) / 1000 + l.phase);
    return Math.max(4, Math.min(100, v));
  });
}

export default function GaugeBarMultiLaneCompare() {
  const fillRefs = useRef(Array.from({ length: 4 }, () => null)) as unknown as Box<(HTMLDivElement | null)[]>;
  const leadRefs = useRef(Array.from({ length: 4 }, () => null)) as unknown as Box<(HTMLDivElement | null)[]>;
  const rowRefs = useRef(Array.from({ length: 4 }, () => null)) as unknown as Box<(HTMLDivElement | null)[]>;
  const crownRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const [isDemo, setIsDemo] = useState(true);

  const lanesRef = useRef(LANES_INIT.map((l) => ({ ...l }))) as unknown as Box<Lane[]>;
  const joltIdxRef = useRef(0) as unknown as Box<number>;
  // 계산 겹: 왕관 이동 간격은 고정 px 이 아니라 실제 행 간격을 측정한 값이다(vanilla 와 동일 원칙)
  const rowStepRef = useRef(30) as unknown as Box<number>;

  function human() {
    isDemoRef.current = false;
    setIsDemo(false);
  }

  function render(t: number) {
    const lanes = lanesRef.current;
    const values = valuesAt(lanes, t);
    const sorted = values.slice().sort((a, b) => b - a);
    const leaderVal = sorted[0];
    const secondVal = sorted[1];
    const leaderIdx = values.indexOf(leaderVal);

    for (let i = 0; i < lanes.length; i++) {
      const v = values[i];
      const fill = fillRefs.current[i];
      const lead = leadRefs.current[i];
      const isLeader = i === leaderIdx;
      if (fill) {
        fill.style.width = v.toFixed(2) + '%';
        fill.classList.toggle(styles.gbLaneFillLead, isLeader);
      }
      // 계산 겹: 선두와 2위의 값 차이만큼만 밝은 겹으로 얹어 "얼마나 앞섰는지" 를 보인다
      if (lead) {
        if (isLeader && leaderVal - secondVal > 0.3) {
          lead.style.left = secondVal.toFixed(2) + '%';
          lead.style.width = (leaderVal - secondVal).toFixed(2) + '%';
          lead.style.opacity = '1';
        } else {
          lead.style.opacity = '0';
        }
      }
    }
    // 계산 겹: translateY 로 왕관 표시를 현재 선두 레인 행으로 옮긴다(DOM 재배치 없이 순위만 계산)
    const crown = crownRef.current;
    if (crown) crown.style.transform = 'translateY(' + leaderIdx * rowStepRef.current + 'px)';
  }

  useEffect(() => {
    const rows = rowRefs.current;
    if (rows[0] && rows[1]) {
      rowStepRef.current = rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top;
    } else if (rows[0]) {
      rowStepRef.current = rows[0].getBoundingClientRect().height;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;
    function loop(ts: number) {
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

  function onJolt() {
    human();
    const d = JOLTS[joltIdxRef.current % JOLTS.length];
    const lanes = lanesRef.current;
    for (let i = 0; i < lanes.length; i++) lanes[i].offset += d[i];
    joltIdxRef.current++;
  }

  function onKeyDown(e: { key: string; preventDefault: () => void }) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onJolt();
  }

  return (
    <div className={`${styles.gb} ${isDemo ? styles.isDemo : ''}`}>
      <div className={styles.gbHead}>
        <span className={styles.gbLabel}>진행도 비교</span>
      </div>
      <div className={styles.gbLanes}>
        {LANES_INIT.map((l, i) => (
          <div
            className={styles.gbRow}
            key={l.label}
            ref={(el: HTMLDivElement | null) => { rowRefs.current[i] = el; }}
          >
            <span className={styles.gbLaneLabel}>{l.label}</span>
            <div className={styles.gbLaneTrack}>
              <div className={styles.gbLaneFill} ref={(el: HTMLDivElement | null) => { fillRefs.current[i] = el; }} />
              <div className={styles.gbLaneLead} ref={(el: HTMLDivElement | null) => { leadRefs.current[i] = el; }} />
            </div>
          </div>
        ))}
        <div className={styles.gbCrown} ref={crownRef} />
      </div>
      <button type="button" className={styles.gbHit} onClick={onJolt} onKeyDown={onKeyDown}>
        순위 흔들기
      </button>
    </div>
  );
}
