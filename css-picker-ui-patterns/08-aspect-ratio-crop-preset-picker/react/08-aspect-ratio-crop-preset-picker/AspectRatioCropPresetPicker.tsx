import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AspectRatioCropPresetPicker.module.scss";

export type AspectRatioCropPresetPickerProps = {
  ratios?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--c"?: string };

export default function AspectRatioCropPresetPicker({
  ratios = ["1/1", "4/5", "16/9", "9/16"],
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ff4d1f",
}: AspectRatioCropPresetPickerProps) {
  const [ratio, setRatio] = useState(ratios[0]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--c": color };

  return (
    <div className={styles.ar} style={vars}>
      <div className={styles.preview}>
        <div className={styles.box} style={{ aspectRatio: ratio }} />
      </div>
      <div className={styles.chips} role="radiogroup" aria-label="Select aspect ratio">
        {ratios.map((r) => (
          <label key={r} className={styles.chip}>
            <input type="radio" name="ratio" className={styles.radio} checked={ratio === r}
              onChange={() => setRatio(r)} />
            <span data-on={ratio === r}>{r.replace("/", ":")}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
