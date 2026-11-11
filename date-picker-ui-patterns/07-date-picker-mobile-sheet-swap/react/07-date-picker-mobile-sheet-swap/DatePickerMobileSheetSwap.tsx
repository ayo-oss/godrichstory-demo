import { useEffect, useRef, useState } from 'react';
import styles from './DatePickerMobileSheetSwap.module.scss';

type Box<T> = { current: T };

const THRESHOLD = 140; // px, 계산 겹: 이 폭 미만이면 바텀시트로 본다
const DAYS = [12, 13, 14, 15, 16];
const TODAY = 14;

export default function DatePickerMobileSheetSwap() {
  const viewportRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const wideRef = useRef(true) as unknown as Box<boolean>;
  const openRef = useRef(false) as unknown as Box<boolean>;
  const [isDemo, setIsDemo] = useState(true);
  const [wide, setWide] = useState(true);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'popover' | 'sheet'>('popover');

  function human() {
    setIsDemo(false);
  }

  function measureMode(): 'popover' | 'sheet' {
    // 계산 겹: 뷰포트 요소의 실제 렌더 폭을 실측해 팝오버/시트 형태를 고른다
    const el = viewportRef.current;
    if (!el) return 'popover';
    const w = el.getBoundingClientRect().width;
    return w < THRESHOLD ? 'sheet' : 'popover';
  }

  useEffect(() => {
    setMode(measureMode());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wide]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const steps: (() => void)[] = [
      () => { wideRef.current = true; openRef.current = true; setWide(true); setOpen(true); },
      () => { wideRef.current = false; openRef.current = true; setWide(false); setOpen(true); },
      () => { openRef.current = false; setOpen(false); },
      () => { wideRef.current = true; openRef.current = true; setWide(true); setOpen(true); },
      () => { wideRef.current = false; openRef.current = true; setWide(false); setOpen(true); },
      () => { openRef.current = false; setOpen(false); },
    ];
    let stepIdx = -1;
    const timer = window.setInterval(() => {
      if (!isDemo) return;
      stepIdx = (stepIdx + 1) % steps.length;
      steps[stepIdx]();
    }, 620);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  function onFieldClick() {
    human();
    setOpen((v) => !v);
  }
  function onToggleClick() {
    human();
    setWide((v) => !v);
    setOpen(true);
  }

  return (
    <div className={`${styles.ms} ${isDemo ? styles.isDemo : ''}`}>
      <div className={`${styles.msViewport} ${!wide ? styles.msViewportNarrow : ''}`} ref={viewportRef}>
        <button type="button" className={styles.msField} onClick={onFieldClick}>
          <span className={styles.msFieldLabel}>날짜</span>
          <span className={styles.msFieldValue}>2026년 3월 14일</span>
        </button>
        <div
          className={`${styles.msPanel} ${open ? styles.isOpen : ''} ${mode === 'sheet' ? styles.msPanelSheet : styles.msPanelPopover}`}
        >
          <div className={styles.msPanelHead}>2026년 3월</div>
          <div className={styles.msStrip}>
            {DAYS.map((d) => (
              <span key={d} className={`${styles.msDay} ${d === TODAY ? styles.msDayToday : ''}`}>{d}</span>
            ))}
          </div>
        </div>
      </div>
      <button type="button" className={styles.msToggle} onClick={onToggleClick}>폭 전환</button>
    </div>
  );
}
