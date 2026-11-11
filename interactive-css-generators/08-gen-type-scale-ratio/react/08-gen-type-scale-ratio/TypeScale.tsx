import { useState, useMemo } from 'react';
import styles from './TypeScale.module.scss';

type Axis = { key: string; label: string; min: number; max: number; step: number };
// ambient 선언에 React 이벤트 제네릭이 없어 로컬 타입으로 받는다 (blog-demo TS7006 항)
type RangeEvt = { target: { value: string } };

const AXES: Axis[] = [
  { key: 'base', label: '기준', min: 12, max: 16, step: 1 },
  { key: 'ratio', label: '배율', min: 110, max: 140, step: 5 }
];

export type TypeScaleProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

export default function TypeScale({ duration = '2s', easing = 'cubic-bezier(.2, .8, .2, 1)', color = '#17141a' }: TypeScaleProps) {
  const [values, setValues] = useState<Record<string, number>>({ base: 14, ratio: 120 });
  const [live, setLive] = useState(true);

  const codeText = useMemo(() => {
    const ratio = values.ratio / 100;
    const lines: string[] = [];
    for (let i = 1; i <= 6; i++) {
      lines.push(`--step-${i}: ${(values.base * Math.pow(ratio, i - 1) / 16).toFixed(3)}rem;`);
    }
    return `:root {\n  ${lines.join('\n  ')}\n}`;
  }, [values]);

  const stepSizes = useMemo(() => {
    // 미리보기 계수 0.6 은 사다리를 무대 안에 들어가게 하는 표시 배율이다 — 단계 비율은 그대로다
    const sizes: number[] = [];
    for (let i = 0; i < 6; i++) {
      sizes.push(values.base * Math.pow(values.ratio / 100, i) * 0.6);
    }
    return sizes;
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
        <div className={styles.preview} aria-hidden="true">
          {stepSizes.map((size, i) => (
            <span key={i} style={{ fontSize: `${size.toFixed(2)}px` }}>{'Step ' + (i + 1)}</span>
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
          <span className={styles.prop}>--step-1:</span> {(values.base / 16).toFixed(3)}rem; <span className={styles.prop}>--step-2:</span> {(values.base * values.ratio / 100 / 16).toFixed(3)}rem; <span className={styles.prop}>--step-3:</span> {(values.base * Math.pow(values.ratio / 100, 2) / 16).toFixed(3)}rem
        </code>
        <button className={styles.copy} type="button" onClick={copy}>복사</button>
      </div>
    </div>
  );
}
