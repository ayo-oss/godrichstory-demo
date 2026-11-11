import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./Coverflow3d.module.scss";

export type Coverflow3dProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

function roleOf(i: number, active: number, n: number): "center" | "prev" | "next" {
  if (i === active) return "center";
  return (i - active + n) % n === 1 ? "next" : "prev";
}

export default function Coverflow3d({ duration = 600, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: Coverflow3dProps) {
  const [active, setActive] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const n = 3;
  return (
    <div className={styles.cf} style={vars}>
      <div className={styles.stageBox}>
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`슬라이드 ${i + 1}`}
            className={`${styles.slide} ${styles["slide" + (i + 1)]} ${styles[roleOf(i, active, n)]}`}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </div>
  );
}
