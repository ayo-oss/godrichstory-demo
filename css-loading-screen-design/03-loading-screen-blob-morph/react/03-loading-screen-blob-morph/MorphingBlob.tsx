import { CSSProperties } from "react";
import styles from "./MorphingBlob.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface MorphingBlobProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function MorphingBlob({
  duration = "2s",
  easing = "linear",
  color = "#fff7e6",
}: MorphingBlobProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return <div className={styles.blob} style={style} aria-hidden="true" />;
}
