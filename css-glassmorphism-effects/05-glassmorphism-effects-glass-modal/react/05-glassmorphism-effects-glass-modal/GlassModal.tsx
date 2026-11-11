import { CSSProperties, useState } from "react";
import styles from "./GlassModal.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
};

export interface GlassModalProps {
  duration?: string;
  easing?: string;
}

export default function GlassModal({
  duration = "600ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
}: GlassModalProps) {
  const [open, setOpen] = useState(false);
  const style: Vars = { "--duration": duration, "--easing": easing };

  return (
    <div className={styles.scene} style={style}>
      <button className={styles.trigger} type="button" onClick={() => setOpen(true)}>
        Delete item
      </button>
      <div
        className={`${styles.overlay} ${open ? styles.isOpen : ""}`}
        onClick={() => setOpen(false)}
      />
      <div className={`${styles.modal} ${open ? styles.isOpen : ""}`}>
        <span className={styles.title}>Delete this file?</span>
        <span className={styles.desc}>This can&apos;t be undone.</span>
      </div>
    </div>
  );
}
