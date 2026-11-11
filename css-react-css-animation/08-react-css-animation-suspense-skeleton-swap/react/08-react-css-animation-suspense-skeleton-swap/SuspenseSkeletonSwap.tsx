import React, { CSSProperties } from "react";
import styles from "./SuspenseSkeletonSwap.module.scss";

function Skeleton() {
  return (
    <div className={styles.skeleton}>
      <span className={`${styles.bar} ${styles.title}`} />
      <span className={styles.bar} />
      <span className={`${styles.bar} ${styles.short}`} />
    </div>
  );
}

// React.lazy simulates a code-split widget — in a real app this import() would be a
// separate chunk fetched over the network, which is exactly what Suspense's fallback
// (the shimmer skeleton above) is there to cover while it loads.
const Widget = React.lazy(
  () =>
    new Promise<{ default: () => any }>((resolve) => {
      setTimeout(() => {
        resolve({
          default: () => (
            <div className={styles.content}>
              <span className={styles.contentTitle}>Widget loaded</span>
              <span className={styles.contentLine}>Lazy-loaded with React.lazy + Suspense</span>
            </div>
          ),
        });
      }, 900);
    })
);

export interface SuspenseSkeletonSwapProps {
  duration?: string;
  easing?: string;
}

export default function SuspenseSkeletonSwap({
  duration = "600ms",
  easing = "ease-out",
}: SuspenseSkeletonSwapProps) {
  const style: CSSProperties & { "--duration"?: string; "--easing"?: string } = {
    "--duration": duration,
    "--easing": easing,
  };

  return (
    <div className={styles.card} style={style}>
      <React.Suspense fallback={<Skeleton />}>
        <Widget />
      </React.Suspense>
    </div>
  );
}
