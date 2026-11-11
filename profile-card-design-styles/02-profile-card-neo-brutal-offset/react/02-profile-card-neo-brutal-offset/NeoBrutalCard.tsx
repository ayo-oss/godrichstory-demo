import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./NeoBrutalCard.module.scss";

export type NeoBrutalCardProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type ClickEvt = { currentTarget: { blur(): void } };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const IconFollow = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true"><g fill="currentColor"><path d="M168 100a60 60 0 1 1-60-60a60 60 0 0 1 60 60" opacity=".2"/><path d="M256 136a8 8 0 0 1-8 8h-16v16a8 8 0 0 1-16 0v-16h-16a8 8 0 0 1 0-16h16v-16a8 8 0 0 1 16 0v16h16a8 8 0 0 1 8 8m-57.87 58.85a8 8 0 0 1-12.26 10.3C165.75 181.19 138.09 168 108 168s-57.75 13.19-77.87 37.15a8 8 0 0 1-12.25-10.3c14.94-17.78 33.52-30.41 54.17-37.17a68 68 0 1 1 71.9 0c20.65 6.76 39.23 19.39 54.18 37.17M108 152a52 52 0 1 0-52-52a52.06 52.06 0 0 0 52 52"/></g></svg>
);
const IconCheck = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true"><g fill="currentColor"><path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2"/><path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32"/></g></svg>
);

export default function NeoBrutalCard({
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: NeoBrutalCardProps) {
  const [on, setOn] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function toggle(e: ClickEvt): void {
    setOn((v: boolean): boolean => !v);
    e.currentTarget.blur();
  }

  return (
    <div className={styles.nb}>
      <article className={styles.card}>
        <div className={styles.head}>
          <div className={styles.avatar}>DH</div>
          <div className={styles.who}>
            <p className={styles.name}>박도현</p>
            <p className={styles.role}>프론트엔드 개발자</p>
          </div>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}><strong className={styles.num}>1,842</strong><span className={styles.lab}>팔로워</span></div>
          <div className={styles.stat}><strong className={styles.num}>36</strong><span className={styles.lab}>게시물</span></div>
        </div>
        <button type="button" className={styles.btn} aria-pressed={on} onClick={toggle}>
          {on ? <IconCheck /> : <IconFollow />}
          <span>{on ? "팔로잉" : "팔로우"}</span>
        </button>
      </article>
    </div>
  );
}
