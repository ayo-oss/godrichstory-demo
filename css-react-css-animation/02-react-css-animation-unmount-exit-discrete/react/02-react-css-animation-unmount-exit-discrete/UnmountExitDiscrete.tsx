import { CSSProperties, useState } from "react";
import styles from "./UnmountExitDiscrete.module.scss";

export interface UnmountExitDiscreteProps {
  duration?: string;
  easing?: string;
}

export default function UnmountExitDiscrete({
  duration = "300ms",
  easing = "ease-out",
}: UnmountExitDiscreteProps) {
  const [open, setOpen] = useState(true);
  const [exiting, setExiting] = useState(false);

  const close = () => {
    // Don't remove the dialog from state right away — add the exit class first.
    // transition-behavior: allow-discrete (in the CSS module) keeps display: flex
    // alive until the transition actually finishes; onTransitionEnd below does the
    // real unmount once the browser reports the animation is done.
    setExiting(true);
  };

  const style: CSSProperties & { "--duration"?: string; "--easing"?: string } = {
    "--duration": duration,
    "--easing": easing,
  };

  if (!open) return null;

  return (
    <div className={styles.wrap} style={style}>
      <div
        className={`${styles.dialog} ${exiting ? styles.exiting : ""}`}
        onTransitionEnd={() => {
          if (exiting) setOpen(false);
        }}
      >
        <span className={styles.title}>Delete file?</span>
        <button className={styles.btn} onClick={close}>Confirm</button>
      </div>
    </div>
  );
}
