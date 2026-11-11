import { useRef } from "react";
import styles from "./LightboxDialog.module.scss";

export interface LightboxDialogProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function LightboxDialog({
  duration = "300ms",
  easing = "ease-out",
}: LightboxDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  function open() {
    dialogRef.current?.showModal();
    closeRef.current?.focus({ preventScroll: true });
  }
  function close() {
    dialogRef.current?.close();
  }

  return (
    <div className={styles.frame} style={{ transitionDuration: duration, transitionTimingFunction: easing }}>
      <button className={styles.thumb} type="button" aria-haspopup="dialog" onClick={open}>
        <span className={styles.thumbPhoto} />
        <span className={styles.thumbLabel}>View</span>
      </button>
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="lb-title-react">
        <div className={styles.dialogPhoto} />
        <h2 id="lb-title-react" className={styles.dialogTitle}>Studio 04</h2>
        <button ref={closeRef} className={styles.close} type="button" onClick={close}>Close</button>
      </dialog>
    </div>
  );
}
