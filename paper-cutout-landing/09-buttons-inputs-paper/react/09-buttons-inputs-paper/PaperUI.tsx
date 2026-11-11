import type { CSSProperties } from "react";
import styles from "./PaperUI.module.scss";

export type PaperUIProps = {
  placeholder?: string;
  solidLabel?: string;
  ghostLabel?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 채운 버튼의 종이색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const MAIL = (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="m224 56l-96 88l-96-88Z" opacity=".2"/><path d="M224 48H32a8 8 0 0 0-8 8v136a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a8 8 0 0 0-8-8m-20.57 16L128 133.15L52.57 64ZM216 192H40V74.19l82.59 75.71a8 8 0 0 0 10.82 0L216 74.19z"/></g></svg>
);

export default function PaperUI({
  placeholder = "you@paper.kit",
  solidLabel = "붙이기",
  ghostLabel = "미리보기",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#cc3d26",
}: PaperUIProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.paperui} style={vars}>
      <label className={styles.field}>
        <span className={styles.ic} aria-hidden="true">{MAIL}</span>
        <input className={styles.input} type="email" placeholder={placeholder} aria-label="이메일" />
      </label>
      <div className={styles.row}>
        <button className={`${styles.btn} ${styles.solid}`} type="button">{solidLabel}</button>
        <button className={`${styles.btn} ${styles.ghost}`} type="button">{ghostLabel}</button>
      </div>
    </section>
  );
}
