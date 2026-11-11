import type { CSSProperties } from "react";
import styles from "./ChecklistProgressCard.module.scss";

const Check = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">
    <path d="M232,56V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Z" opacity="0.2" />
    <path d="M205.66,85.66l-96,96a8,8,0,0,1-11.32,0l-40-40a8,8,0,0,1,11.32-11.32L104,164.69l90.34-90.35a8,8,0,0,1,11.32,11.32Z" />
  </svg>
);

export type ChecklistProgressCardProps = {
  duration?: number;
  easing?: string;
  color?: string;
  title?: string;
  caption?: string;
  /** 이미 끝난 항목 (정지 상태) */
  done?: string[];
  /** 이 데모에서 차례로 체크되는 항목 */
  running?: string[];
};

export default function ChecklistProgressCard({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
  title = "Getting started",
  caption = "2 of 4 done",
  done = ["Create account", "Invite your team"],
  running = ["Write first post", "Set up alerts"],
}: ChecklistProgressCardProps) {
  const vars: CSSProperties = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  } as CSSProperties;

  return (
    <div className={styles.card} style={vars}>
      <div className={styles.head}>
        <span className={styles.h}>{title}</span>
        <span className={styles.p}>{caption}</span>
      </div>
      <div className={styles.bar} aria-hidden="true"><i /></div>
      <ul className={styles.list} aria-label={title}>
        {done.map((label) => (
          <li key={label} className={`${styles.row} ${styles.isDone}`}>
            <span className={styles.box} aria-hidden="true"><Check /></span>
            <span className={styles.lb}>{label}<i className={styles.ln} aria-hidden="true" /></span>
          </li>
        ))}
        {running.map((label, i) => {
          // 줄마다 반 주기씩 늦게 체크된다. 지연은 style 로 — scss 에서 단축 속성을 쓰지 않는 이유
          const delay = { animationDelay: `${(duration / 2) * i}ms` } as CSSProperties;
          return (
            <li key={label} className={styles.row}>
              <span className={`${styles.box} ${styles.tick}`} style={delay} aria-hidden="true"><Check /></span>
              <span className={styles.lb}>{label}<i className={`${styles.ln} ${styles.strike}`} style={delay} aria-hidden="true" /></span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
