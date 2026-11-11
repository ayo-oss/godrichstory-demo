import { useState } from "react";
import styles from "./PermissionRequestModal.module.scss";

export type PermissionRequestModalProps = {
  title?: string;
  description?: string;
  onAllow?: () => void;
  onDeny?: () => void;
};

/** 권한 요청 모달 — Allow/Deny 또는 Escape 로 닫힌다 */
export default function PermissionRequestModal({
  title = "Allow camera access?",
  description = "Used only during identity verification.",
  onAllow,
  onDeny,
}: PermissionRequestModalProps) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const close = (fn?: () => void) => () => {
    fn?.();
    setOpen(false);
  };
  return (
    <div className={styles.scene}>
      <div className={styles.backdrop} />
      <div
        className={styles.modal}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e: any) => e.key === "Escape" && setOpen(false)}
      >
        <span className={styles.icon} aria-hidden="true">
          <svg viewBox="0 0 256 256">
            <g fill="currentColor">
              <path d="M216 56v56c0 96-88 120-88 120s-88-24-88-120V56a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2" />
              <path d="M208 40H48a16 16 0 0 0-16 16v56c0 52.72 25.52 84.67 46.93 102.19c23.06 18.86 46 25.26 47 25.53a8 8 0 0 0 4.2 0c1-.27 23.91-6.67 47-25.53C198.48 196.67 224 164.72 224 112V56a16 16 0 0 0-16-16m0 72c0 37.07-13.66 67.16-40.6 89.42a129.3 129.3 0 0 1-39.4 22.2a128.3 128.3 0 0 1-38.92-22.2C61.66 175.16 48 145.07 48 108V56h160Z" />
            </g>
          </svg>
        </span>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.desc}>{description}</p>
        <div className={styles.actions}>
          <button className={styles.ghost} type="button" onClick={close(onDeny)}>Deny</button>
          <button className={styles.primary} type="button" onClick={close(onAllow)}>Allow</button>
        </div>
      </div>
    </div>
  );
}
