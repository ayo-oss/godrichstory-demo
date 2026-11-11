import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./EmojiReactionPopupPicker.module.scss";

export type EmojiOption = { emoji: string; label: string };
export type EmojiReactionPopupPickerProps = {
  triggerLabel?: string;
  emojis?: EmojiOption[];
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--accent"?: string };

export default function EmojiReactionPopupPicker({
  triggerLabel = "React",
  emojis = [
    { emoji: "👍", label: "Like" },
    { emoji: "😂", label: "Haha" },
    { emoji: "🎉", label: "Awesome" },
    { emoji: "😢", label: "Sad" },
  ],
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  accentColor = "#0a4fe8",
}: EmojiReactionPopupPickerProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--accent": accentColor };

  return (
    <div className={styles.rp} style={vars} onKeyDown={(e: { key: string }) => e.key === "Escape" && setOpen(false)}>
      <div className={styles.pop} role="menu" aria-label="Emoji reactions" data-open={open}>
        {emojis.map((e) => (
          <button key={e.label} type="button" className={styles.emoji} role="menuitem" aria-label={e.label} onClick={() => setOpen(false)}>
            {e.emoji}
          </button>
        ))}
      </div>
      <button type="button" className={styles.trigger} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {triggerLabel}
      </button>
    </div>
  );
}
