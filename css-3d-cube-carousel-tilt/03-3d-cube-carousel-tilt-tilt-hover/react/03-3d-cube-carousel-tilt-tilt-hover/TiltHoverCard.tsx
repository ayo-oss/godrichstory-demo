import type { CSSProperties, ReactNode } from "react";
import styles from "./TiltHoverCard.module.scss";

export type TiltHoverCardProps = {
  duration?: number;
  easing?: string;
  /** 카드 배경 */
  color?: string;
  children?: ReactNode;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

// 032(card-hover-tilt-3d-parallax) 와 달리 마우스 좌표를 안 읽는다 — :hover 값이 고정 각도로 붙는 순수 CSS 버전
export default function TiltHoverCard({
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
  children = "제품 미리보기",
}: TiltHoverCardProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.frame}>
      <div className={styles.tilt} style={vars} tabIndex={0}>
        {children}
      </div>
    </div>
  );
}
