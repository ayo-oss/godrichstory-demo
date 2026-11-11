import { useState, useMemo } from 'react';
import styles from './GradientStops.module.scss';

type Axis = { key: string; cssVar: string; label: string; min: number; max: number };
// ambient 선언에 React 이벤트 제네릭이 없어 로컬 타입으로 받는다 (blog-demo TS7006 항)
type RangeEvt = { target: { value: string } };

const AXES: Axis[] = [
  { key: 'angle', cssVar: '--grad-angle', label: '각도', min: 0, max: 360 },
  { key: 'stopA', cssVar: '--grad-stop-a', label: '갈림 A', min: 0, max: 100 },
  { key: 'stopB', cssVar: '--grad-stop-b', label: '갈림 B', min: 0, max: 100 }
];

export type GradientStopsProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

export default function GradientStops({ duration = '2s', easing = 'cubic-bezier(.2, .8, .2, 1)', color = '#5b8cf8' }: GradientStopsProps) {
  const [values, setValues] = useState<Record<string, number>>({ angle: 45, stopA: 30, stopB: 75 });
  const [live, setLive] = useState(true);

  const codeText = useMemo(() => {
    return `linear-gradient(${values.angle}deg, #2f6df6 ${values.stopA}%, #ff9ebb ${values.stopB}%);`;
  }, [values]);

  const style = {
    '--dur-loop': duration,
    '--ease-spring': easing,
    '--accent': color,
    '--grad-angle': values.angle,
    '--grad-stop-a': values.stopA,
    '--grad-stop-b': values.stopB
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
        <div className={styles.preview} aria-hidden="true"><span className={styles.angleMark}></span></div>
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
                  step={5}
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
          <span className={styles.prop}>linear-gradient(</span>{values.angle}deg, #2f6df6 {values.stopA}%, #ff9ebb {values.stopB}%)
        </code>
        <button className={styles.copy} type="button" onClick={copy}>복사</button>
      </div>
    </div>
  );
}
