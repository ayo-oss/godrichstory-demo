import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GithubRepoCard.module.scss";

export type GithubRepoCardProps = {
  duration?: number;
  easing?: string;
  color?: string;
  repo?: string;
};

export default function GithubRepoCard({ duration = 2000, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#2f6df6", repo = "godrichstory / demo-widgets" }: GithubRepoCardProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  const [starred, setStarred] = useState(false);
  const [stars, setStars] = useState(482);

  return (
    <div className={styles.card} style={vars}>
      <div><span className={styles.repo}>{repo}</span></div>
      <p className={styles.desc}>임베드 위젯 9종 — vanilla + React, MIT</p>
      <div className={styles.stats}>
        <span className={styles.lang}><i className={styles.dot} aria-hidden="true" />SCSS</span>
        <button
          className={`${styles.star} ${starred ? styles.active : ""}`}
          type="button" aria-pressed={starred}
          onClick={() => { setStarred((v) => !v); setStars((n) => n + (starred ? -1 : 1)); }}
        >
          <svg className={styles.icStar} viewBox="0 0 256 256" width="20" height="20" aria-hidden="true"><g fill="currentColor">
            <path opacity=".2" d="m229.06 108.79l-48.7 42l14.88 62.79a8.4 8.4 0 0 1-12.52 9.17L128 189.09l-54.72 33.65a8.4 8.4 0 0 1-12.52-9.17l14.88-62.79l-48.7-42A8.46 8.46 0 0 1 31.73 94l63.91-5.2l24.62-59.6a8.36 8.36 0 0 1 15.48 0l24.62 59.6l63.91 5.2a8.46 8.46 0 0 1 4.79 14.79" />
            <path d="M239.18 97.26A16.38 16.38 0 0 0 224.92 86l-59-4.76l-22.78-55.09a16.36 16.36 0 0 0-30.27 0L90.11 81.23L31.08 86a16.46 16.46 0 0 0-9.37 28.86l45 38.83L53 211.75a16.38 16.38 0 0 0 24.5 17.82l50.5-31.08l50.53 31.08A16.4 16.4 0 0 0 203 211.75l-13.76-58.07l45-38.83a16.43 16.43 0 0 0 4.94-17.59Z" />
          </g></svg>
          <span>{stars}</span>
        </button>
        <span className={styles.fork}>
          <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true"><g fill="currentColor">
            <path opacity=".2" d="M88 64a24 24 0 1 1-24-24a24 24 0 0 1 24 24m104-24a24 24 0 1 0 24 24a24 24 0 0 0-24-24" />
            <path d="M224 64a32 32 0 1 0-40 31v17a8 8 0 0 1-8 8H80a8 8 0 0 1-8-8V95a32 32 0 1 0-16 0v17a24 24 0 0 0 24 24h40v25a32 32 0 1 0 16 0v-25h40a24 24 0 0 0 24-24V95a32.06 32.06 0 0 0 24-31M48 64a16 16 0 1 1 16 16a16 16 0 0 1-16-16m96 128a16 16 0 1 1-16-16a16 16 0 0 1 16 16m48-112a16 16 0 1 1 16-16a16 16 0 0 1-16 16" />
          </g></svg>
          56
        </span>
      </div>
    </div>
  );
}
