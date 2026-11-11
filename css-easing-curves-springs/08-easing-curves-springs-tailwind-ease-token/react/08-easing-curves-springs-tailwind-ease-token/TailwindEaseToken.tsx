import type { CSSProperties } from "react";
import styles from "./TailwindEaseToken.module.scss";

export type TailwindEaseTokenProps = {
  duration?: number;
  color?: string;
};

// Tailwind v4 는 @theme 에 --ease-spring 을 등록하면 ease-(--ease-spring) 유틸이 생긴다.
// 이 컴포넌트는 Tailwind 를 불러오지 않고(외부 의존 0) 같은 --ease-* 커스텀 프로퍼티 패턴만 재현한다
export default function TailwindEaseToken({ duration = 2000, color = "#2f6df6" }: TailwindEaseTokenProps) {
  const vars: CSSProperties = {
    "--duration": `${duration}ms`,
    "--color": color,
    "--ease-spring": "cubic-bezier(.34, 1.56, .64, 1)",
  } as CSSProperties;
  return (
    <div className={styles.stage} style={vars}>
      <div className={styles.track}>
        <span className={`${styles.dot} ${styles.dotStart}`} />
        <span className={`${styles.dot} ${styles.dotEnd}`} />
        <div className={styles.puck} />
      </div>
    </div>
  );
}
