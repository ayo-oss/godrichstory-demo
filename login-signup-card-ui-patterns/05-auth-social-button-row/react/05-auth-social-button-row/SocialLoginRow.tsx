import type { CSSProperties } from "react";
import styles from "./SocialLoginRow.module.scss";

export type SocialLoginRowProps = {
  /** 호버 lift 전환 시간 (기본 140ms) */
  duration?: number;
  easing?: string;
  color?: string;
  onSelect?: (provider: "google" | "apple" | "kakao") => void;
};

/** 클릭한 provider 를 그대로 콜백으로 넘긴다 — 실제 OAuth 시작은 호출부 몫 */
export default function SocialLoginRow({
  duration = 140,
  easing = "ease-out",
  color = "#2f6df6",
  onSelect,
}: SocialLoginRowProps) {
  const style = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.row} style={style}>
      {(["google", "apple", "kakao"] as const).map((p) => (
        <button key={p} type="button" className={styles.btn} onClick={() => onSelect?.(p)}>
          <span className={`${styles.dot} ${styles[p]}`} />
          {p[0].toUpperCase() + p.slice(1)}
        </button>
      ))}
    </div>
  );
}
