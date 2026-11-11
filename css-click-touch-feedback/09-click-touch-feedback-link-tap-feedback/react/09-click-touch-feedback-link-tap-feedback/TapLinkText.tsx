import type { CSSProperties, ReactNode } from "react";
import styles from "./TapLinkText.module.scss";

export type TapLinkTextProps = {
  before: string;
  linkText: string;
  after: string;
  href?: string;
  duration?: number;
  easing?: string;
  color?: string;
  children?: ReactNode;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TapLinkText({
  before,
  linkText,
  after,
  href = "#",
  duration = 140,
  easing = "ease-out",
  color = "#5b8cf8",
}: TapLinkTextProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <p className={styles.p} style={vars}>
      {before} <a href={href} className={styles.link}>{linkText}</a>{after}
    </p>
  );
}
