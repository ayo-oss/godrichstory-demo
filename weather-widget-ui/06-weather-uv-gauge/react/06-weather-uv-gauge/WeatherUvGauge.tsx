import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./WeatherUvGauge.module.scss";

// vanilla 판(run/281/demo/06-weather-uv-gauge/index.html) 의 React 포트.
// 바늘은 0~11 을 -90도~+90도로 바꿔 돈다. 등급과 지침 문장이 값에 함께 따라온다.

export type UvLevel = {
  max: number;
  grade: string;
  advice: string;
};

export type WeatherUvGaugeProps = {
  groupLabel?: string;
  dialLabel?: string;
  indexLabel?: string;
  rangeAria?: string;
  levels?: UvLevel[];
  /** 처음에 골라 둔 지수 */
  value?: number;
  /** 지수 최대(눈금 폭) */
  scaleMax?: number;
  /** 격자 미리보기 루프가 컷으로 맞바꾸는 두 번째 지수 */
  loopTo?: number;
  /** 격자 미리보기 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// 바늘 각도 — inline style 로 넣는다
type NeedleVars = CSSProperties & { transform?: string };

const DEFAULT_LEVELS: UvLevel[] = [
  { max: 2, grade: "낮음", advice: "오래 있어도 괜찮아요" },
  { max: 5, grade: "보통", advice: "그늘을 섞어 쉬세요" },
  { max: 7, grade: "높음", advice: "선크림을 바르고 모자를 쓰세요" },
  { max: 10, grade: "매우 높음", advice: "한낮에는 실내로 피하세요" },
  { max: 11, grade: "위험", advice: "외출을 줄이세요" },
];

function levelOf(v: number, levels: UvLevel[]): UvLevel {
  for (let i = 0; i < levels.length; i++) {
    if (v <= levels[i].max) return levels[i];
  }
  return levels[levels.length - 1];
}

export default function WeatherUvGauge({
  groupLabel = "자외선 지수 게이지",
  dialLabel = "자외선 지수 눈금",
  indexLabel = "지수",
  rangeAria = "자외선 지수 고르기",
  levels = DEFAULT_LEVELS,
  value = 6,
  scaleMax = 11,
  loopTo = 2,
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: WeatherUvGaugeProps) {
  const [now, setNow] = useState(value);
  const [live, setLive] = useState(demo);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const needleVars: NeedleVars = { transform: `rotate(${(now / scaleMax) * 180 - 90}deg)` };
  const cur = levelOf(now, levels);
  const alt = levelOf(loopTo, levels);

  function slide(e: { target: { value: string } }): void {
    setLive(false);
    setNow(Number(e.target.value));
  }

  const cls = [styles.uv, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <section className={cls} style={vars} aria-label={groupLabel}>
        <div className={styles.dial} role="img" aria-label={dialLabel}>
          <span className={styles.disc} aria-hidden="true" />
          <span className={styles.needle} style={needleVars} aria-hidden="true" />
          <span className={styles.hub} aria-hidden="true" />
        </div>
        <div className={styles.panel}>
          <p className={styles.value}>
            <output className={styles.swap}>
              <span className={styles.v}>{now}</span>
              <span className={styles.alt} aria-hidden="true">{loopTo}</span>
            </output>
          </p>
          <p className={styles.grade}>
            <span className={styles.swap}>
              <span className={styles.v}>{cur.grade}</span>
              <span className={styles.alt} aria-hidden="true">{alt.grade}</span>
            </span>
          </p>
          <p className={styles.advice}>
            <span className={styles.swap}>
              <span className={styles.v}>{cur.advice}</span>
              <span className={styles.alt} aria-hidden="true">{alt.advice}</span>
            </span>
          </p>
          <label className={styles.lab} htmlFor="uv-range">{indexLabel}</label>
          <input
            className={styles.range}
            id="uv-range"
            type="range"
            min={0}
            max={scaleMax}
            step={1}
            value={now}
            aria-label={rangeAria}
            aria-valuenow={now}
            onChange={slide}
          />
        </div>
      </section>
    </main>
  );
}
