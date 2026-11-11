import type { CSSProperties } from "react";
import styles from "./FadeSlideLead.module.scss";

export type FadeSlideLeadProps = {
  children?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function FadeSlideLead({
  children = "One line is all it takes",
  duration = 400,
  easing = "ease-out",
  color = "#fff7e6",
}: FadeSlideLeadProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <p className={styles.lead} style={vars}>
      {children}
    </p>
  );
}
