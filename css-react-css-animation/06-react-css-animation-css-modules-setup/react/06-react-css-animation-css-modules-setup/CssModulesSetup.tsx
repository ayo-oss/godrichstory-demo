import { CSSProperties } from "react";
import styles from "./CssModulesSetup.module.scss";

export interface CssModulesSetupProps {
  duration?: string;
  easing?: string;
}

// This item is meta: styles.card and styles.title below aren't hardcoded strings —
// they're exactly what CSS Modules generated from the classnames in
// CssModulesSetup.module.scss at build time (e.g. "card_a3f9k1"). Rendering them is
// literally what this whole post's react/ folder relies on.
export default function CssModulesSetup({
  duration = "220ms",
  easing = "ease-out",
}: CssModulesSetupProps) {
  const style: CSSProperties & { "--duration"?: string; "--easing"?: string } = {
    "--duration": duration,
    "--easing": easing,
  };

  return (
    <div className={styles.term} style={style}>
      <div className={styles.bar}><span /><span /><span /></div>
      <div className={styles.line}>Card.module.scss</div>
      <div className={styles.accent}>styles.card → "{styles.card}"</div>
      <div className={styles.accent}>styles.title → "{styles.title}"</div>
    </div>
  );
}
