import { CSSProperties, useState } from "react";
import styles from "./CubeFourFaces.module.scss";

export interface CubeFourFacesProps {
  duration?: string;
  easing?: string;
  faces?: [string, string, string, string];
}

export default function CubeFourFaces({
  duration = "600ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  faces = ["Photo", "Details", "$29", "Buy"],
}: CubeFourFacesProps) {
  const [step, setStep] = useState(0);
  const style = { "--duration": duration, "--easing": easing, "--step": step } as CSSProperties;
  return (
    <div className={styles.scene}>
      <button
        type="button"
        className={styles.cube}
        style={style}
        aria-label="Show next face"
        onClick={() => setStep((s) => s + 1)}
      >
        {faces.map((f, i) => (
          <span key={f} className={`${styles.face} ${styles["face" + i]}`}>{f}</span>
        ))}
      </button>
    </div>
  );
}
