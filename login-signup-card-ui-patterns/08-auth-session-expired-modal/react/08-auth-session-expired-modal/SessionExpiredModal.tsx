import type { CSSProperties } from "react";
import styles from "./SessionExpiredModal.module.scss";

export type SessionExpiredModalProps = {
  open: boolean;
  onReLogin?: () => void;
  /** 모달 등장 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
};

/** open 이 바뀔 때마다 backdrop 과 모달이 함께 페이드+스케일 전환된다 */
export default function SessionExpiredModal({
  open,
  onReLogin,
  duration = 600,
  easing = "cubic-bezier(.2,1.4,.4,1)",
}: SessionExpiredModalProps) {
  const style = { "--duration": `${duration}ms`, "--easing": easing } as CSSProperties;
  return (
    <div className={styles.scene} style={style}>
      <div className={styles.page}>
        <span className={styles.line} />
        <span className={`${styles.line} ${styles.short}`} />
        <span className={styles.line} />
      </div>
      <div className={`${styles.backdrop} ${open ? styles.show : ""}`} />
      <div className={`${styles.modal} ${open ? styles.show : ""}`} role="alertdialog" aria-label="Session expired" aria-hidden={!open}>
        <h2 className={styles.title}>Session expired</h2>
        <p className={styles.desc}>Please sign in again to continue.</p>
        <button className={styles.btn} type="button" onClick={onReLogin}>Log in again</button>
      </div>
    </div>
  );
}
