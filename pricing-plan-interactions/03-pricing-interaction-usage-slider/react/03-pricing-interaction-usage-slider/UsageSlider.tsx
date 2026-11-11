import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./UsageSlider.module.scss";

export type UsageSliderProps = {
  usageLabel?: string;
  feeLabel?: string;
  seatUnit?: string;
  unit?: string;
  currency?: string;
  seats?: number[];
  perSeat?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

// React 이벤트 타입은 import 하지 않는다 — 필요한 모양만 여기서 적는다
type RangeEvt = { currentTarget: { value: string } };

type Vars = CSSProperties & {
  "--p"?: string;
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function UsageSlider({
  usageLabel = "Monthly usage",
  feeLabel = "Estimated fee",
  seatUnit = "seats",
  unit = "/ mo",
  currency = "$",
  seats = [3, 5, 10, 20, 50],
  perSeat = 8,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: UsageSliderProps) {
  const [demo, setDemo] = useState(true);
  const [step, setStep] = useState(1);
  const now = seats[step - 1];
  const vars: Vars = {
    "--p": String(step),
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  // 요금 숫자는 CSS 보간이 아니라 여기서 글자로 만든다
  function fee(n: number) {
    return `${currency}${n * perSeat}`;
  }
  function onInput(e: RangeEvt) {
    setDemo(false);
    setStep(parseInt(e.currentTarget.value, 10));
  }

  return (
    <div className={`${styles.us} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.row}>
        <span className={styles.lab}>{usageLabel}</span>
        <span className={styles.slot}>
          <span className={styles.live}>
            <span className={styles.n}>{now}</span>
            <span className={styles.u}>{seatUnit}</span>
          </span>
          {seats.map((s, i) => (
            <span key={s} className={styles.f} data-step={i + 1}>
              <span className={styles.n}>{s}</span>
              <span className={styles.u}>{seatUnit}</span>
            </span>
          ))}
        </span>
      </div>
      <div className={styles.track}>
        <span className={styles.rail} aria-hidden="true">
          <span className={styles.fill} />
        </span>
        <input
          className={styles.range}
          type="range"
          min={1}
          max={seats.length}
          step={1}
          value={step}
          aria-label={usageLabel}
          aria-valuetext={`${now} ${seatUnit}`}
          onChange={onInput}
        />
        <span className={styles.knobrail} aria-hidden="true">
          <span className={styles.knob} />
        </span>
      </div>
      <div className={styles.ticks} aria-hidden="true">
        {seats.map((s) => (
          <i key={s} className={styles.tick} />
        ))}
      </div>
      <div className={styles.row}>
        <span className={styles.lab}>{feeLabel}</span>
        <span className={`${styles.slot} ${styles.slotFee}`} aria-live="polite">
          <span className={styles.live}>
            <span className={styles.n}>{fee(now)}</span>
            <span className={styles.u}>{unit}</span>
          </span>
          {seats.map((s, i) => (
            <span key={s} className={styles.f} data-step={i + 1}>
              <span className={styles.n}>{fee(s)}</span>
              <span className={styles.u}>{unit}</span>
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
