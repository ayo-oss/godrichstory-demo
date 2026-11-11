import { useState, useMemo } from 'react';
import styles from './ClipPolygon.module.scss';

// 60도 간격 여섯 방향의 계수표 — vanilla scss 의 clip-path calc 와 같은 표를 공유한다
const DIRS: Array<[number, number]> = [
  [0, -1], [0.87, -0.5], [0.87, 0.5], [0, 1], [-0.87, 0.5], [-0.87, -0.5]
];
// ambient 선언에 React 이벤트 제네릭이 없어 로컬 타입으로 받는다 (blog-demo TS7006 항)
type RangeEvt = { target: { value: string } };

export type ClipPolygonProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

export default function ClipPolygon({ duration = '2s', easing = 'cubic-bezier(.2, .8, .2, 1)', color = '#17141a' }: ClipPolygonProps) {
  const [values, setValues] = useState<number[]>([90, 60, 80, 60, 85, 65]);
  const [live, setLive] = useState(true);

  const clipStyle = useMemo(() => {
    const pts = DIRS.map((d, i) => {
      const x = 50 + d[0] * values[i];
      const y = 50 + d[1] * values[i] * 0.6;
      return `${x.toFixed(0)}% ${y.toFixed(0)}%`;
    });
    return `polygon(${pts.join(', ')})`;
  }, [values]);

  const codeText = useMemo(() => {
    const pts = DIRS.map((d, i) => {
      const x = Math.round(50 + d[0] * values[i]);
      const y = Math.round(50 + d[1] * values[i] * 0.6);
      return `${x}% ${y}%`;
    });
    return `clip-path: ${clipStyle};`;
  }, [values, clipStyle]);

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
        <div className={styles.previewFrame} aria-hidden="true">
          <div className={styles.preview} style={{ clipPath: clipStyle }}></div>
        </div>
        <div className={styles.grid}>
          {DIRS.map((_, i) => (
            <label className={styles.row} key={i}>
              <span className={styles.lab}>{'꼭짓점' + (i + 1)}</span>
              <span className={styles.slot}>
                <input
                  className={styles.rng}
                  type="range"
                  min={20}
                  max={100}
                  step={5}
                  value={values[i]}
                  aria-label={(i + 1) + ' 번째 꼭짓점 반경'}
                  onChange={(e: RangeEvt) => {
                    setLive(false);
                    setValues((v) => v.map((x, j) => (j === i ? Number(e.target.value) : x)));
                  }}
                />
                <span className={styles.thumb} aria-hidden="true" style={{ left: `${((values[i] - 20) / 80) * 100}%` }} />
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className={styles.out}>
        <code className={styles.code}>
          <span className={styles.prop}>clip-path:</span> {values[0]}% {values[1]}% {values[2]}% {values[3]}% {values[4]}% {values[5]}%
        </code>
        <button className={styles.copy} type="button" onClick={copy}>복사</button>
      </div>
    </div>
  );
}
