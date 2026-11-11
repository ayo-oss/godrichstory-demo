import { CSSProperties, useEffect, useState } from "react";
import styles from "./MountFadeStartingStyle.module.scss";

export interface MountFadeStartingStyleProps {
  duration?: string;
  easing?: string;
  color?: string;
}

function Card({ color }: { color: string }) {
  // React 19: @starting-style (in the CSS module below) defines what this card looked
  // like before it existed in the DOM, so no useEffect("mounted") flag is needed for
  // the fade-in — the browser transitions from that starting state automatically.
  return (
    <div className={styles.card} style={{ background: color }}>
      <span className={styles.dot} />
      <span className={styles.title}>New card</span>
      <span className={styles.sub}>mounted just now</span>
    </div>
  );
}

export default function MountFadeStartingStyle({
  duration = "600ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: MountFadeStartingStyleProps) {
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setMounted((m) => !m), 1400);
    return () => clearInterval(id);
  }, []);

  const style: CSSProperties & { "--duration"?: string; "--easing"?: string } = {
    "--duration": duration,
    "--easing": easing,
  };

  return (
    <div className={styles.wrap} style={style}>
      {mounted ? <Card color={color} /> : null}
    </div>
  );
}
