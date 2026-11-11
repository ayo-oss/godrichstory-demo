import type { CSSProperties } from "react";
import styles from "./LightDarkSwitch.module.scss";

export type LightDarkSwitchProps = {
  /** true 면 color-scheme: dark 로 light-dark() 값이 뒤집힌다 */
  dark: boolean;
  onToggle?: () => void;
  duration?: number;
  easing?: string;
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function LightDarkSwitch({
  dark,
  onToggle,
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
  className = "",
}: LightDarkSwitchProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <button
      type="button"
      className={`${styles.chip} ${className}`}
      style={vars}
      data-dark={dark}
      aria-label="다크모드 전환"
      onClick={onToggle}
    >
      <span className={`${styles.swatch} ${styles.light}`} />
      <span className={`${styles.swatch} ${styles.dark}`} />
    </button>
  );
}
