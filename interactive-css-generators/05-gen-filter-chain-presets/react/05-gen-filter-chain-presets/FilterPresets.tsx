import { useState, useMemo } from 'react';
import styles from './FilterPresets.module.scss';

type Axis = { key: string; label: string; min: number; max: number; step: number };
// ambient 선언에 React 이벤트 제네릭이 없어 로컬 타입으로 받는다 (blog-demo TS7006 항)
type RangeEvt = { target: { value: string } };

const AXES: Axis[] = [
  { key: 'bri', label: '밝기', min: 50, max: 150, step: 5 },
  { key: 'con', label: '대비', min: 50, max: 150, step: 5 },
  { key: 'sat', label: '채도', min: 0, max: 200, step: 10 },
  { key: 'blur', label: '블러', min: 0, max: 8, step: 1 }
];

const PRESETS: Array<{ name: string; values: Record<string, number> }> = [
  { name: '몽롱한 오후', values: { bri: 100, con: 110, sat: 130, blur: 0 } },
  { name: '잉크 사진', values: { bri: 100, con: 115, sat: 0, blur: 0 } },
  { name: '기억색', values: { bri: 85, con: 140, sat: 180, blur: 2 } }
];

export type FilterPresetsProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

export default function FilterPresets({ duration = '2s', easing = 'cubic-bezier(.2, .8, .2, 1)', color = '#5b8cf8' }: FilterPresetsProps) {
  const [values, setValues] = useState<Record<string, number>>({ bri: 100, con: 110, sat: 130, blur: 0 });
  const [live, setLive] = useState(true);

  const filterStyle = useMemo(() => {
    return `brightness(${values.bri}%) contrast(${values.con}%) saturate(${values.sat}%) blur(${values.blur}px)`;
  }, [values]);

  const style = {
    '--dur-loop': duration,
    '--ease-spring': easing,
    '--accent': color
  } as Record<string, string | number>;

  function copy() {
    setLive(false);
    const text = `filter: ${filterStyle};`;
    try {
      navigator.clipboard.writeText(text);
    } catch (err) {
      /* 클립보드가 막힌 환경에서는 조용히 넘어간다 */
    }
  }

  return (
    <div className={live ? `${styles.gen} ${styles.isDemo}` : styles.gen} style={style}>
      <div className={styles.top}>
        <div className={styles.preview} aria-hidden="true" style={{ filter: filterStyle }}>
          <span className={styles.sun}></span>
          <span className={`${styles.hill} ${styles.hillA}`}></span>
          <span className={`${styles.hill} ${styles.hillB}`}></span>
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
      <div className={styles.presets}>
        {PRESETS.map((p) => (
          <button key={p.name} className={styles.preset} type="button" onClick={() => { setLive(false); setValues(p.values); }}>
            {p.name}
          </button>
        ))}
      </div>
      <div className={styles.out}>
        <code className={styles.code}>
          <span className={styles.prop}>filter:</span> brightness({values.bri}%) contrast({values.con}%) saturate({values.sat}%) blur({values.blur}px)
        </code>
        <button className={styles.copy} type="button" onClick={copy}>복사</button>
      </div>
    </div>
  );
}
