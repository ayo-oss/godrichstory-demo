import type { CSSProperties } from "react";
import styles from "./BookOpen.module.scss";

export type BookOpenProps = {
  duration?: number;
  easing?: string;
  /** 표지 색 */
  color?: string;
  cover?: string;
  page?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BookOpen({
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#0a4fe8",
  cover = "매뉴얼",
  page = "1장. 시작하기",
}: BookOpenProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.book} style={vars}>
      <div className={styles.page}>{page}</div>
      <div className={styles.cover}>
        <div className={`${styles.face} ${styles.front}`}>{cover}</div>
        <div className={`${styles.face} ${styles.back}`} />
      </div>
    </div>
  );
}
