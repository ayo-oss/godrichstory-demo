import { useState, useMemo } from 'react';
import styles from './GridColumns.module.scss';

type Axis = { key: string; label: string; min: number; max: number; step: number };
// ambient 선언에 React 이벤트 제네릭이 없어 로컬 타입으로 받는다 (blog-demo TS7006 항)
type RangeEvt = { target: { value: string } };

const AXES: Axis[] = [
  { key: 'min', label: '최소폭', min: 80, max: 260, step: 20 },
  { key: 'gap', label: '간격', min: 0, max: 24, step: 4 }
];

export type GridColumnsProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

export default function GridColumns({ duration = '2s', easing = 'cubic-bezier(.2, .8, .2, 1)', color = '#5b8cf8' }: GridColumnsProps) {
  const [values, setValues] = useState<Record<string, number>>({ min: 120, gap: 8 });
  const [live, setLive] = useState(true);

  const codeText = useMemo(() => {
    return `grid-template-columns: repeat(auto-fit, minmax(${values.min}px, 1fr));\ngap: ${values.gap}px;`;
  }, [values]);

  const gridStyle = useMemo(() => {
    // 미리보기 상자가 실제 사용 폭보다 작으므로 계수 0.32 로 눈금만 줄인다 — 칸 수 변화는 그대로 보인다
    return {
      gridTemplateColumns: `repeat(auto-fit, minmax(${values.min * 0.32}px, 1fr))`,
      gap: `${values.gap * 0.32}px`
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
        <div className={styles.preview} aria-hidden="true" style={gridStyle}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
            <span key={i} className={i % 2 === 0 ? styles.cellA : styles.cellB}></span>
          ))}
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
          <span className={styles.prop}>grid-template-columns:</span> repeat(auto-fit, minmax({values.min}px, 1fr)); <span className={styles.prop}>gap:</span> {values.gap}px
        </code>
        <button className={styles.copy} type="button" onClick={copy}>복사</button>
      </div>
    </div>
  );
}
