import type { CSSProperties, MouseEvent, ReactNode } from "react";
import styles from "./PoyonButton.module.scss";

export type PoyonButtonProps = {
  children: ReactNode;
  /** 한 번 튕기는 데 걸리는 시간 (기본 550ms) */
  duration?: number;
  /** CSS easing (기본 넘겼다 돌아오는 elastic overshoot) */
  easing?: string;
  color?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

// 마우스를 올리거나 키보드로 포커스하면 한 번 튕긴다. 상태 없이 :hover·:focus-visible 로 CSS 가 처리한다.
export default function PoyonButton({
  children,
  duration = 550,
  easing = "cubic-bezier(.34,1.56,.64,1)",
  color = "#fff7e6",
  onClick,
}: PoyonButtonProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <button type="button" className={styles.btn} style={vars} onClick={onClick}>
      {children}
    </button>
  );
}
