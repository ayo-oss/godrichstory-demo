import { useRef, useState, useCallback } from "react";
import type { CSSProperties, MouseEvent } from "react";
import styles from "./BeforeAfterClickReveal.module.scss";

export type BeforeAfterClickRevealProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--reveal"?: string };

/**
 * 사진 아무 곳이나 클릭하면 그 x좌표로 경계선이 바로 옮겨간다.
 * clip-path 로 before 레이어를 잘라 after 위에 얹는다 — 드래그 없이 클릭 한 번.
 */
export default function BeforeAfterClickReveal({
  duration = "2s",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: BeforeAfterClickRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [reveal, setReveal] = useState(50);
  const [demo, setDemo] = useState(true);

  const jump = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pct = ((e.clientX - r.left) / r.width) * 100;
    setDemo(false);
    setReveal(Math.max(0, Math.min(100, pct)));
  }, []);

  const vars: Vars = { "--reveal": `${reveal}%`, ["--duration" as string]: duration, ["--easing" as string]: easing, ["--color" as string]: color };

  return (
    <div
      ref={ref}
      className={demo ? `${styles.ba} ${styles.isDemo}` : styles.ba}
      style={vars}
      onClick={jump}
      role="img"
      aria-label="클릭하면 경계가 옮겨가는 전후 비교"
    >
      <div className={styles.after} />
      <div className={styles.before} />
      <div className={styles.line} />
    </div>
  );
}
