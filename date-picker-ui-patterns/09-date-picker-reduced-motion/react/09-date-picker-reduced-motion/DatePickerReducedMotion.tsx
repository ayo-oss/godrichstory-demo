import { useEffect, useState } from 'react';
import styles from './DatePickerReducedMotion.module.scss';

export default function DatePickerReducedMotion() {
  const [isDemo, setIsDemo] = useState(true);
  const [open, setOpen] = useState(false);

  function human() {
    setIsDemo(false);
  }

  function toggle() {
    setOpen((v) => !v);
  }

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const timer = window.setInterval(() => {
      if (!isDemo) return;
      setOpen((v) => !v);
    }, 620);
    return () => window.clearInterval(timer);
  }, [isDemo]);

  return (
    <div className={`${styles.rm} ${isDemo ? styles.isDemo : ''}`}>
      <div className={styles.rmCol}>
        <span className={styles.rmTag}>일반</span>
        <div className={styles.rmMini}>
          <button
            type="button"
            className={styles.rmField}
            onClick={() => { human(); toggle(); }}
          >
            3월 14일
          </button>
          <div className={`${styles.rmPop} ${styles.rmPopNormal} ${open ? styles.isOpen : ''}`}>
            <div className={styles.rmPopRow}>12 13 <b>14</b> 15 16</div>
          </div>
        </div>
      </div>
      <div className={styles.rmCol}>
        <span className={styles.rmTag}>감소된 모션</span>
        <div className={styles.rmMini}>
          <button
            type="button"
            className={styles.rmField}
            onClick={() => { human(); toggle(); }}
          >
            3월 14일
          </button>
          <div className={`${styles.rmPop} ${styles.rmPopReduced} ${open ? styles.isOpen : ''}`}>
            <div className={styles.rmPopRow}>12 13 <b>14</b> 15 16</div>
          </div>
        </div>
      </div>
    </div>
  );
}
