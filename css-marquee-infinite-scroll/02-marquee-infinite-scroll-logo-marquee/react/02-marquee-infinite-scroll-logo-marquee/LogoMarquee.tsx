import type { CSSProperties } from "react";
import styles from "./LogoMarquee.module.scss";

export type LogoMarqueeProps = {
  label?: string;
  logos?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function LogoMarquee({
  label = "Partners",
  logos = ["NORTH", "ACME", "ORBIT", "VELA", "KADE"],
  duration = 12000,
  easing = "linear",
  color = "#17141a",
}: LogoMarqueeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.marquee} style={vars}>
      <p className={styles.label}>{label}</p>
      <div className={styles.row}>
        <div className={styles.track}>
          {logos.map((l) => (
            <span key={l} className={styles.logo}>{l}</span>
          ))}
          {logos.map((l) => (
            <span key={"dup-" + l} className={styles.logo} aria-hidden="true">{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
