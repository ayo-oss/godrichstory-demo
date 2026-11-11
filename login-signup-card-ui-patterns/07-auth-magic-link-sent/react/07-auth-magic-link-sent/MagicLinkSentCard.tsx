import { useEffect, useState } from "react";
import styles from "./MagicLinkSentCard.module.scss";

export type MagicLinkSentCardProps = {
  email: string;
  /** 재전송 대기 초 (기본 30) */
  cooldown?: number;
  onResend?: () => void;
};

/** 마운트·재전송마다 cooldown 초를 세고, 0 이 되면 재전송 버튼이 풀린다 */
export default function MagicLinkSentCard({ email, cooldown = 30, onResend }: MagicLinkSentCardProps) {
  const [left, setLeft] = useState(cooldown);
  useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(id);
  }, [left]);
  const resend = () => {
    if (left > 0) return;
    onResend?.();
    setLeft(cooldown);
  };
  return (
    <div className={styles.card}>
      <span className={styles.envelope} aria-hidden="true">
        <svg className={styles.icon} viewBox="0 0 256 256">
          <g fill="currentColor"><path d="m224 56l-96 88l-96-88Z" opacity=".2" /><path d="M224 48H32a8 8 0 0 0-8 8v136a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a8 8 0 0 0-8-8m-20.57 16L128 133.15L52.57 64ZM216 192H40V74.19l82.59 75.71a8 8 0 0 0 10.82 0L216 74.19z" /></g>
        </svg>
        <span className={styles.badge} />
      </span>
      <h2 className={styles.title}>Check your email</h2>
      <p className={styles.desc}>We sent a sign-in link to {email}</p>
      <button className={styles.resend} type="button" disabled={left > 0} onClick={resend}>
        {left > 0 ? `Resend in ${left}s` : "Resend link"}
      </button>
    </div>
  );
}
