import { useState, useMemo } from 'react';
import styles from './ShadowStack.module.scss';

type Axis = { key: string; cssVar: string; label: string; min: number; max: number };
// ambient 선언에 React 이벤트 제네릭이 없어 로컬 타입으로 받는다 (blog-demo TS7006 항)
type RangeEvt = { target: { value: string } };

// 바닐라 판과 같은 네 축. 값은 사용자 지정 속성으로 내려보내고 미리보기·손잡이·코드가 함께 읽는다
const AXES: Axis[] = [
  { key: 'x', cssVar: '--shadow-x', label: '가로', min: -24, max: 24 },
  { key: 'y', cssVar: '--shadow-y', label: '세로', min: -24, max: 24 },
  { key: 'blur', cssVar: '--shadow-blur', label: '번짐', min: 0, max: 48 },
  { key: 'spread', cssVar: '--shadow-spread', label: '퍼짐', min: -12, max: 12 }
];

export type ShadowStackProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

export default function ShadowStack({ duration = '2s', easing = 'cubic-bezier(.2, .8, .2, 1)', color = '#5b8cf8' }: ShadowStackProps) {
  const [values, setValues] = useState<Record<string, number>>({ x: 0, y: 10, blur: 20, spread: -4 });
  const [live, setLive] = useState(true);

  const codeText = useMemo(() => {
    const { x, y, blur, spread } = values;
    return `box-shadow: ${x}px ${y}px ${blur}px ${spread}px rgba(23,20,26,.34),\n            ${Math.round(x / 2)}px ${Math.round(y / 2)}px ${Math.round(blur / 2)}px 0 rgba(23,20,26,.22);`;
  }, [values]);

  const style = {
    '--dur-loop': duration,
    '--ease-spring': easing,
    '--accent': color,
    '--shadow-x': values.x,
    '--shadow-y': values.y,
    '--shadow-blur': values.blur,
    '--shadow-spread': values.spread
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
        <div className={styles.preview} aria-hidden="true"><span className={styles.chip}>Card</span></div>
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
                  step={2}
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
          <span className={styles.prop}>box-shadow:</span> {values.x}px {values.y}px {values.blur}px {values.spread}px rgba(23,20,26,.34)
        </code>
        <button className={styles.copy} type="button" onClick={copy}>복사</button>
      </div>
    </div>
  );
}
