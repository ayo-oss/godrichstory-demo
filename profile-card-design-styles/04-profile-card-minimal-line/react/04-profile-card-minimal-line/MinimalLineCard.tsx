import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./MinimalLineCard.module.scss";

export type MinimalLineCardProps = {
  name?: string;
  role?: string;
  initials?: string;
  followers?: string;
  posts?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type ClickEvt = { currentTarget: { blur(): void } };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const IconUserPlus = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true"><g fill="currentColor"><path d="M168 100a60 60 0 1 1-60-60a60 60 0 0 1 60 60" opacity=".2"/><path d="M256 136a8 8 0 0 1-8 8h-16v16a8 8 0 0 1-16 0v-16h-16a8 8 0 0 1 0-16h16v-16a8 8 0 0 1 16 0v16h16a8 8 0 0 1 8 8m-57.87 58.85a8 8 0 0 1-12.26 10.3C165.75 181.19 138.09 168 108 168s-57.75 13.19-77.87 37.15a8 8 0 0 1-12.25-10.3c14.94-17.78 33.52-30.41 54.17-37.17a68 68 0 1 1 71.9 0c20.65 6.76 39.23 19.39 54.18 37.17M108 152a52 52 0 1 0-52-52a52.06 52.06 0 0 0 52 52"/></g></svg>
);
const IconCheck = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true"><g fill="currentColor"><path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2"/><path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32"/></g></svg>
);

export default function MinimalLineCard({
  name = "최연우",
  role = "브랜드 전략가",
  initials = "YW",
  followers = "812",
  posts = "41",
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: MinimalLineCardProps): ReactNode {
  const [on, setOn] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const toggle = (e: ClickEvt): void => {
    setOn((v: boolean): boolean => !v);
    e.currentTarget.blur();
  };

  return (
    <div className={styles.ml} style={vars}>
      <article className={styles.card}>
        <div className={styles.avatar} aria-hidden="true">{initials}</div>
        <h2 className={styles.name}>
          {name}
          <span className={styles.nameLine} aria-hidden="true" />
        </h2>
        <p className={styles.role}>{role}</p>
        <p className={styles.stats}>
          <span className={styles.stat}><strong>{followers}</strong>팔로워</span>
          <span className={styles.stat}><strong>{posts}</strong>게시물</span>
        </p>
        <button type="button" className={styles.follow} aria-pressed={on} onClick={toggle}>
          {on ? <IconCheck /> : <IconUserPlus />}
          <span className={styles.label}>{on ? "팔로잉" : "팔로우"}</span>
          <span className={styles.btnLine} aria-hidden="true" />
        </button>
      </article>
    </div>
  );
}
