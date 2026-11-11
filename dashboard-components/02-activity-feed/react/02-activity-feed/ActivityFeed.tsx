import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ActivityFeed.module.scss";

export type ActivityFeedProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ActivityFeed({ duration = 600, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#2f6df6" }: ActivityFeedProps) {
  const [shown, setShown] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.af} style={vars}>
      <div className={styles.head}>
        <strong className={styles.title}>Recent activity</strong>
        <button type="button" className={styles.more} disabled={shown} onClick={() => setShown(true)}>
          {shown ? "All caught up" : "Show new activity"}
        </button>
      </div>
      <ul className={styles.list}>
        <li className={styles.item}>
          <span className={`${styles.ic} ${styles.check}`}>✓</span>
          <div><p className={styles.text}>Deployment completed</p><time className={styles.time}>3m ago</time></div>
        </li>
        <li className={styles.item}>
          <span className={`${styles.ic} ${styles.chat}`}>💬</span>
          <div><p className={styles.text}>Minji left a comment</p><time className={styles.time}>18m ago</time></div>
        </li>
        <li className={`${styles.item} ${styles.newItem} ${shown ? styles.shown : ""}`}>
          <span className={`${styles.ic} ${styles.upload}`}>↑</span>
          <div><p className={styles.text}>A new file was uploaded</p><time className={styles.time}>Just now</time></div>
        </li>
      </ul>
    </div>
  );
}
