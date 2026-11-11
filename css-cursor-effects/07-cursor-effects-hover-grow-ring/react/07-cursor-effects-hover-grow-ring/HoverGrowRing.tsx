import { useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./HoverGrowRing.module.scss";

export type HoverGrowRingProps = {
  links?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function HoverGrowRing({
  links = ["기능", "가격"],
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: HoverGrowRingProps) {
  const [demo, setDemo] = useState(true);
  const [pos, setPos] = useState({ x: 90, y: 60 });
  const [grow, setGrow] = useState(false);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    setDemo(false);
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
    setGrow((e.target as HTMLElement).closest("a") !== null);
  };

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars} onPointerMove={move}>
      <a className={`${styles.link} ${styles.linkA}`} href="#">{links[0]}</a>
      <a className={`${styles.link} ${styles.linkB}`} href="#">{links[1]}</a>
      <div
        className={demo ? `${styles.cursorPos} ${styles.isDemo}` : styles.cursorPos}
        style={demo ? undefined : { transform: `translate(${pos.x}px,${pos.y}px)` }}
        aria-hidden="true"
      >
        <div className={grow ? `${styles.ring} ${styles.ringGrow}` : styles.ring} />
      </div>
    </div>
  );
}
