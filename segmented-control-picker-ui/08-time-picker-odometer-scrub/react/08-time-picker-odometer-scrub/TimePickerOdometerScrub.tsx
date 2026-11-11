import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TimePickerOdometerScrub.module.scss";

export type TimePickerOdometerScrubProps = {
  initialHour?: number;
  initialMinute?: number;
  duration?: number;
  easing?: string;
  digitColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--digit"?: string };

function pad(n: number) {
  return String((n + 60) % 60).padStart(2, "0");
}

export default function TimePickerOdometerScrub({
  initialHour = 9,
  initialMinute = 5,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  digitColor = "#17141a",
}: TimePickerOdometerScrubProps) {
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--digit": digitColor };

  function Column({ value, unit, onChange, incLabel, decLabel }: { value: number; unit: string; onChange: (d: number) => void; incLabel: string; decLabel: string }) {
    return (
      <div className={styles.col}>
        <button type="button" className={styles.btn} aria-label={incLabel} onClick={() => onChange(1)}>+</button>
        <div className={styles.win} key={value}>
          <span className={styles.val}>{pad(value)}</span>
        </div>
        <button type="button" className={styles.btn} aria-label={decLabel} onClick={() => onChange(-1)}>−</button>
        <span className={styles.unit}>{unit}</span>
      </div>
    );
  }

  return (
    <div className={styles.tp} style={vars}>
      <Column value={hour} unit="hr" incLabel="Increase hour" decLabel="Decrease hour" onChange={(d) => setHour((h) => Number(pad(h + d)))} />
      <span className={styles.colon} aria-hidden="true">:</span>
      <Column value={minute} unit="min" incLabel="Increase minute" decLabel="Decrease minute" onChange={(d) => setMinute((m) => Number(pad(m + d)))} />
    </div>
  );
}
