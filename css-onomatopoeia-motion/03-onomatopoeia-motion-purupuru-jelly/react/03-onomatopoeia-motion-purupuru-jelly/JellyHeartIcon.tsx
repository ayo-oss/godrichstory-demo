import type { CSSProperties, MouseEvent } from "react";
import styles from "./JellyHeartIcon.module.scss";

export type JellyHeartIconProps = {
  /** 스크린리더용 라벨 (기본 "찜하기") */
  label?: string;
  /** 한 번 떠는 데 걸리는 시간 (기본 900ms) */
  duration?: number;
  easing?: string;
  color?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function JellyHeartIcon({
  label = "찜하기",
  duration = 900,
  easing = "ease-in-out",
  color = "#fff7e6",
  onClick,
}: JellyHeartIconProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <button type="button" className={styles.icon} style={vars} aria-label={label} onClick={onClick}>
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <path
          d="M12 21s-7.5-4.6-10-9.3C.4 8 2 4.5 5.6 4 8 3.6 10 5 12 7c2-2 4-3.4 6.4-3 3.6.5 5.2 4 3.6 7.7C19.5 16.4 12 21 12 21z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}
