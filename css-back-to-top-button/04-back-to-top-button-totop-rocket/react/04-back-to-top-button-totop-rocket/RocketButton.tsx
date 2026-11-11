import type { CSSProperties } from "react";
import styles from "./RocketButton.module.scss";

export type RocketButtonProps = {
  /** 발사 애니메이션 시간 (기본 700ms) */
  duration?: number;
  easing?: string;
  flameColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--flame"?: string };

// 실제 사용: 마우스를 올리거나 키보드로 포커스하면 로켓이 한 번 발사된다. 상태 없이 CSS 로 처리한다
export default function RocketButton({
  duration = 700,
  easing = "ease-out",
  flameColor = "#ff4d1f",
}: RocketButtonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--flame": flameColor };
  return (
    <button
      type="button"
      className={styles.totop}
      style={vars}
      aria-label="맨 위로 발사"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <svg className={styles.rocket} viewBox="0 0 24 28" aria-hidden="true">
        <path className={styles.body} d="M12 1 C17 6 18 12 16 18 L8 18 C6 12 7 6 12 1 Z" />
        <circle className={styles.window} cx="12" cy="10" r="2.4" />
        <path className={styles.fin} d="M8 15 L3 20 L8 19 Z" />
        <path className={styles.fin} d="M16 15 L21 20 L16 19 Z" />
        <path className={styles.flame} d="M9.5 18 L12 25 L14.5 18 Z" />
      </svg>
    </button>
  );
}
