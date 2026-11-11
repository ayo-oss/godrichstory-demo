import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AvatarIconPickerGridSelect.module.scss";

type Avatar = { emoji: string; name: string; c: string };

export type AvatarIconPickerGridSelectProps = {
  label?: string;
  avatars?: Avatar[];
  duration?: number;
  easing?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--c"?: string };

const DEFAULT_AVATARS: Avatar[] = [
  { emoji: "🐱", name: "Coco", c: "#ff9ebb" },
  { emoji: "🐰", name: "Tori", c: "#b9a0ff" },
  { emoji: "🐻", name: "Bori", c: "#4cd4a6" },
  { emoji: "🦊", name: "Yeoul", c: "#6ec8ff" },
  { emoji: "🐼", name: "Panda", c: "#ff9ebb" },
  { emoji: "🐨", name: "Koal", c: "#b9a0ff" },
];

export default function AvatarIconPickerGridSelect({
  label = "Select an avatar",
  avatars = DEFAULT_AVATARS,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
}: AvatarIconPickerGridSelectProps) {
  const [cur, setCur] = useState(0);
  const active = avatars[cur];
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--c": active?.c ?? "#ff9ebb" };

  function move(i: number, d: number) {
    const n = (i + d + avatars.length) % avatars.length;
    setCur(n);
    document.getElementById(`avatar-item-${n}`)?.focus();
  }

  return (
    <div className={styles.ava} style={vars}>
      <div className={styles.preview}>
        <span>{active?.emoji}</span><span>{active?.name}</span>
      </div>
      <div className={styles.grid} role="radiogroup" aria-label={label}>
        {avatars.map((a, i) => (
          <button
            key={a.name}
            id={`avatar-item-${i}`}
            type="button"
            className={styles.item}
            role="radio"
            aria-checked={cur === i}
            data-on={cur === i}
            style={{ "--item-c": a.c } as CSSProperties}
            tabIndex={cur === i ? 0 : -1}
            onClick={() => setCur(i)}
            onKeyDown={(e: any) => {
              const d = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key];
              if (d !== undefined) { e.preventDefault(); move(i, d); }
            }}
          >
            {a.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
