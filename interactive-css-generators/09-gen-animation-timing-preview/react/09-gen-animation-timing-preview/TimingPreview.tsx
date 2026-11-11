import { useState, useMemo } from 'react';
import styles from './TimingPreview.module.scss';

type Axis = { key: string; label: string; min: number; max: number; step: number };
// ambient 선언에 React 이벤트 제네릭이 없어 로컬 타입으로 받는다 (blog-demo TS7006 항)
type RangeEvt = { target: { value: string } };

const AXES: Axis[] = [
  { key: 'dur', label: '길이', min: 200, max: 1200, step: 100 },
  { key: 'delay', label: '지연', min: 0, max: 400, step: 50 },
  { key: 'iter', label: '반복', min: 1, max: 5, step: 1 }
];

export type TimingPreviewProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

export default function TimingPreview({ duration = '2s', easing = 'cubic-bezier(.2, 1.4, .4, 1)', color = '#17141a' }: TimingPreviewProps) {
  const [values, setValues] = useState<Record<string, number>>({ dur: 600, delay: 0, iter: 2 });
  const [live, setLive] = useState(true);

  const codeText = useMemo(() => {
    return `animation-duration: ${values.dur}ms;\nanimation-delay: ${values.delay}ms;\nanimation-iteration-count: ${values.iter};`;
  }, [values]);

  // 값이 바뀔 때마다 key 를 바꿔 애니메이션을 새로 띄운다 — CSS cancel 에 해당하는 React 관용
  const animKey = useMemo(() => `${values.dur}-${values.delay}-${values.iter}`, [values]);

  const style = {
    '--dur-loop': duration,
    '--ease-spring': easing,
    '--accent': color,
    '--a-dur': values.dur,
    '--a-delay': values.delay,
    '--a-iter': values.iter
  } as Record<string, string | number>;

  function copy() {
    setLive(false);
    try {
      navigator.clipboard.writeText(codeText);
    } catch (err) {
      /* 클립보드가 막힌 환경에서는 조용히 넘어간다 */
    }
  }

  return (
    <div className={live ? `${styles.gen} ${styles.isDemo}` : styles.gen} style={style}>
      <div className={styles.top}>
        <div className={styles.preview} aria-hidden="true">
          <span className={styles.trackLine}></span>
          <span key={animKey} className={styles.ball}></span>
        </div>
        <div className={styles.grid}>
          {AXES.map((axis) => (
            <label className={styles.row} key={axis.key}>
              <span className={styles.lab}>{axis.label}</span>
              <span className={styles.slot}>
                <input
                  className={styles.rng}
                  type="range"
                  min={axis.min}
                  max={axis.max}
                  step={axis.step}
                  value={values[axis.key]}
                  aria-label={axis.label}
                  onChange={(e: RangeEvt) => {
                    setLive(false);
                    setValues((v) => ({ ...v, [axis.key]: Number(e.target.value) }));
                  }}
                />
                <span
                  className={styles.thumb}
                  aria-hidden="true"
                  style={{ left: `${((values[axis.key] - axis.min) / (axis.max - axis.min)) * 100}%` }}
                />
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className={styles.out}>
        <code className={styles.code}>
          <span className={styles.prop}>animation-duration:</span> {values.dur}ms; <span className={styles.prop}>animation-delay:</span> {values.delay}ms; <span className={styles.prop}>animation-iteration-count:</span> {values.iter}
        </code>
        <button className={styles.copy} type="button" onClick={copy}>복사</button>
      </div>
    </div>
  );
}
