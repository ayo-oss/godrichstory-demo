import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./ClayPuffCard.module.scss";

export type ClayPuffCardProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type ClickEvt = { currentTarget: { blur(): void } };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const IconStar = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true"><g fill="currentColor"><path d="m229.06 108.79l-48.7 42l14.88 62.79a8.4 8.4 0 0 1-12.52 9.17L128 189.09l-54.72 33.65a8.4 8.4 0 0 1-12.52-9.17l14.88-62.79l-48.7-42A8.46 8.46 0 0 1 31.73 94l63.91-5.2l24.62-59.6a8.36 8.36 0 0 1 15.48 0l24.62 59.6l63.91 5.2a8.46 8.46 0 0 1 4.79 14.79" opacity=".2"/><path d="M239.18 97.26A16.38 16.38 0 0 0 224.92 86l-59-4.76l-22.78-55.09a16.36 16.36 0 0 0-30.27 0L90.11 81.23L31.08 86a16.46 16.46 0 0 0-9.37 28.86l45 38.83L53 211.75a16.38 16.38 0 0 0 24.5 17.82l50.5-31.08l50.53 31.08A16.4 16.4 0 0 0 203 211.75l-13.76-58.07l45-38.83a16.43 16.43 0 0 0 4.94-17.59m-15.34 5.47l-48.7 42a8 8 0 0 0-2.56 7.91l14.88 62.8a.37.37 0 0 1-.17.48c-.18.14-.23.11-.38 0l-54.72-33.65a8 8 0 0 0-8.38 0l-54.72 33.67c-.15.09-.19.12-.38 0a.37.37 0 0 1-.17-.48l14.88-62.8a8 8 0 0 0-2.56-7.91l-48.7-42c-.12-.1-.23-.19-.13-.5s.18-.27.33-.29l63.92-5.16a8 8 0 0 0 6.72-4.94l24.62-59.61c.08-.17.11-.25.35-.25s.27.08.35.25L153 91.86a8 8 0 0 0 6.75 4.92l63.92 5.16c.15 0 .24 0 .33.29s0 .4-.16.5"/></g></svg>
);
const IconCheck = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true"><g fill="currentColor"><path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2"/><path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32"/></g></svg>
);

export default function ClayPuffCard({
  duration = 300,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#b9a0ff",
}: ClayPuffCardProps) {
  const [on, setOn] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function toggle(e: ClickEvt): void {
    setOn((v: boolean): boolean => !v);
    e.currentTarget.blur();
  }

  return (
    <article className={styles.cp}>
      <div className={styles.head}>
        <div className={styles.avatar}>HY</div>
        <div className={styles.who}>
          <p className={styles.name}>정하윤</p>
          <p className={styles.role}>일러스트레이터</p>
        </div>
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}><strong className={styles.num}>5,108</strong><span className={styles.lab}>팔로워</span></div>
        <div className={styles.stat}><strong className={styles.num}>94</strong><span className={styles.lab}>게시물</span></div>
      </div>
      <button type="button" className={styles.btn} aria-pressed={on} onClick={toggle}>
        {on ? <IconCheck /> : <IconStar />}
        <span>{on ? "팔로잉" : "팔로우"}</span>
      </button>
    </article>
  );
}
