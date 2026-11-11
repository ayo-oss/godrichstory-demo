import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./EmojiReactionBurstCountBadge.module.scss";

export type EmojiReactionBurstCountBadgeProps = {
  ariaLabel?: string;
  emoji?: string;
  initialCount?: number;
  duration?: number;
  easing?: string;
  burstColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--burst"?: string };

export default function EmojiReactionBurstCountBadge({
  ariaLabel = "Leave a heart reaction",
  emoji = "❤️",
  initialCount = 12,
  duration = 600,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  burstColor = "#2f6df6",
}: EmojiReactionBurstCountBadgeProps) {
  const [count, setCount] = useState(initialCount);
  const [playKey, setPlayKey] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--burst": burstColor };

  function react() {
    setCount((c) => c + 1);
    setPlayKey((k) => k + 1);
  }

  return (
    <div className={styles.bc} style={vars}>
      <button type="button" className={styles.btn} aria-label={ariaLabel} onClick={react}>
        <span className={styles.emoji} key={`e${playKey}`} data-play={playKey > 0}>{emoji}</span>
        <span className={styles.burst} key={`b${playKey}`} data-play={playKey > 0} aria-hidden="true" />
      </button>
      <span className={styles.count} aria-live="polite">
        <span className={styles.srOnly}>Reaction count</span> {count}
      </span>
    </div>
  );
}
