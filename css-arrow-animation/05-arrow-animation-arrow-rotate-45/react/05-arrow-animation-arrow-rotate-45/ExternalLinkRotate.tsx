import { CSSProperties } from "react";
import styles from "./ExternalLinkRotate.module.scss";

export interface ExternalLinkRotateProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function ExternalLinkRotate({
  duration = "260ms",
  easing = "cubic-bezier(.34, 1.56, .64, 1)",
  color = "#fff7e6",
}: ExternalLinkRotateProps) {
  const style = { "--duration": duration, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <a className={styles.link} href="#" target="_blank" rel="noopener" style={style}>
      <span>example.com</span>
      <span className={styles.arrow}>
        <span className={styles.shape} />
        <span className={styles.trail} aria-hidden="true" />
      </span>
    </a>
  );
}
