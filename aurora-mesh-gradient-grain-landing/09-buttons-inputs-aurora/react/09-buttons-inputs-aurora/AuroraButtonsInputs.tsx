import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AuroraButtonsInputs.module.scss";

export type AuroraButtonsInputsProps = {
  placeholder?: string;
  cta?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function AuroraButtonsInputs({
  placeholder = "Email address",
  cta = "Sign up",
  duration = 2000,
  easing = "ease-out",
  color = "#ffd23f",
}: AuroraButtonsInputsProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const [hover, setHover] = useState(false);

  return (
    <form className={styles.form} style={vars} onSubmit={(e: { preventDefault: () => void }) => e.preventDefault()}>
      <input className={styles.input} type="email" placeholder={placeholder} />
      <button
        type="submit"
        className={`${styles.btn} ${hover ? styles.active : ""}`}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {cta}
      </button>
    </form>
  );
}
