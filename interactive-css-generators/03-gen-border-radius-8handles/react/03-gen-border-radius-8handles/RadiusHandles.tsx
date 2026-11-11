import { useState, useMemo } from 'react';
import styles from './RadiusHandles.module.scss';

type Axis = { key: string; label: string; min: number; max: number };
// ambient 선언에 React 이벤트 제네릭이 없어 로컬 타입으로 받는다 (blog-demo TS7006 항)
type RangeEvt = { target: { value: string } };

const AXES: Axis[] = [
  { key: 'tl', label: '왼위', min: 0, max: 80 },
  { key: 'tr', label: '오위', min: 0, max: 80 },
  { key: 'br', label: '오아', min: 0, max: 80 },
  { key: 'bl', label: '왼아', min: 0, max: 80 },
  { key: 'vy', label: '세로 반경', min: 0, max: 80 }
];

export type RadiusHandlesProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

export default function RadiusHandles({ duration = '2s', easing = 'cubic-bezier(.2, .8, .2, 1)', color = '#17141a' }: RadiusHandlesProps) {
  const [values, setValues] = useState<Record<string, number>>({ tl: 12, tr: 48, br: 12, bl: 48, vy: 28 });
  const [live, setLive] = useState(true);

  const codeText = useMemo(() => {
    return `border-radius: ${values.tl}px ${values.tr}px ${values.br}px ${values.bl}px / ${values.vy}px;`;
  }, [values]);

  const style = {
    '--dur-loop': duration,
    '--ease-spring': easing,
    '--accent': color,
    '--r-tl': values.tl,
    '--r-tr': values.tr,
    '--r-br': values.br,
    '--r-bl': values.bl,
    '--r-vy': values.vy
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
        <div className={styles.previewWrap} aria-hidden="true">
          <div className={styles.preview}></div>
          <span className={styles.dot} style={{ left: values.tl, top: values.vy }}></span>
          <span className={styles.dot} style={{ right: values.tr, top: values.vy }}></span>
          <span className={styles.dot} style={{ right: values.br, bottom: values.vy }}></span>
          <span className={styles.dot} style={{ left: values.bl, bottom: values.vy }}></span>
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
                  step={4}
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
                  style={{ left: `${(values[axis.key] / axis.max) * 100}%` }}
                />
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className={styles.out}>
        <code className={styles.code}>
          <span className={styles.prop}>border-radius:</span> {values.tl}px {values.tr}px {values.br}px {values.bl}px / {values.vy}px
        </code>
        <button className={styles.copy} type="button" onClick={copy}>복사</button>
      </div>
    </div>
  );
}
