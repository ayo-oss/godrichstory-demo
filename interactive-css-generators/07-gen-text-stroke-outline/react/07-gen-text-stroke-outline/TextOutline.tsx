import { useState, useMemo } from 'react';
import styles from './TextOutline.module.scss';

type Axis = { key: string; label: string; min: number; max: number; step: number };
// ambient 선언에 React 이벤트 제네릭이 없어 로컬 타입으로 받는다 (blog-demo TS7006 항)
type RangeEvt = { target: { value: string } };

const AXES: Axis[] = [
  { key: 'sw', label: '테두리', min: 0, max: 8, step: 1 },
  { key: 'fill', label: '채움', min: 0, max: 100, step: 10 }
];

export type TextOutlineProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

export default function TextOutline({ duration = '2s', easing = 'cubic-bezier(.2, .8, .2, 1)', color = '#17141a' }: TextOutlineProps) {
  const [values, setValues] = useState<Record<string, number>>({ sw: 3, fill: 100 });
  const [live, setLive] = useState(true);

  const codeText = useMemo(() => {
    return `-webkit-text-stroke: ${values.sw}px #17141a;\ncolor: rgba(255,247,230,${values.fill}%);`;
  }, [values]);

  const wordStyle = useMemo(() => {
    return {
      color: `rgba(255,247,230,${values.fill}%)`,
      WebkitTextStroke: `${values.sw}px #17141a`
    } as Record<string, string>;
  }, [values]);

  const style = {
    '--dur-loop': duration,
    '--ease-spring': easing,
    '--accent': color
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
        <div className={styles.preview} aria-hidden="true"><span className={styles.word} style={wordStyle}>GO</span></div>
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
          <span className={styles.prop}>-webkit-text-stroke:</span> {values.sw}px #17141a; <span className={styles.prop}>color:</span> rgba(255,247,230,{values.fill}%)
        </code>
        <button className={styles.copy} type="button" onClick={copy}>복사</button>
      </div>
    </div>
  );
}
