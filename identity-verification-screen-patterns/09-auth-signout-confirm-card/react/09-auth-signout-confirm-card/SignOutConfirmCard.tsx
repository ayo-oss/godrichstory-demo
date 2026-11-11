import { useState } from "react";
import styles from "./SignOutConfirmCard.module.scss";

export type SignOutConfirmCardProps = {
  onCancel?: () => void;
  onConfirm?: () => void;
};

/** 사인아웃 전 마지막 확인 카드 — Sign out 을 누르면 위험 상태로 고정되고, Cancel 로 되돌린다 */
export default function SignOutConfirmCard({ onCancel, onConfirm }: SignOutConfirmCardProps) {
  const [confirmed, setConfirmed] = useState(false);
  const cancel = () => { setConfirmed(false); onCancel?.(); };
  const confirm = () => { setConfirmed(true); onConfirm?.(); };
  return (
    <div className={confirmed ? `${styles.card} ${styles.confirmed}` : styles.card}>
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 256 256">
          <g fill="currentColor"><path d="M224 56v144a16 16 0 0 1-16 16H48V40h160a16 16 0 0 1 16 16" opacity=".2" /><path d="M120 216a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8V40a8 8 0 0 1 8-8h64a8 8 0 0 1 0 16H56v160h56a8 8 0 0 1 8 8m109.66-93.66l-40-40a8 8 0 0 0-11.32 11.32L204.69 120H112a8 8 0 0 0 0 16h92.69l-26.35 26.34a8 8 0 0 0 11.32 11.32l40-40a8 8 0 0 0 0-11.32" /></g>
        </svg>
      </span>
      <h2 className={styles.title}>Sign out of this device?</h2>
      <p className={styles.desc}>You'll need to sign in again to continue.</p>
      <div className={styles.actions}>
        <button className={styles.cancel} type="button" onClick={cancel}>Cancel</button>
        <button className={styles.danger} type="button" onClick={confirm}>Sign out</button>
      </div>
    </div>
  );
}
