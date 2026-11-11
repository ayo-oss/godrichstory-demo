import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ActiveSlideScale.module.scss";

export type ActiveSlideScaleProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ActiveSlideScale({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#ff4d1f" }: ActiveSlideScaleProps) {
  const [active, setActive] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.as} style={vars}>
      <div className={styles.track}>
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`슬라이드 ${i + 1}`}
            className={`${styles.slide} ${styles["slide" + (i + 1)]} ${i === active ? styles.isActive : ""}`}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </div>
  );
}
