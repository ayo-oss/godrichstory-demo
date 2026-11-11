import { useState, type CSSProperties } from "react";
import styles from "./TagChipRemove.module.scss";

export type TagChipRemoveProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

const INITIAL = ["Design", "Marketing", "Remote"];

export default function TagChipRemove({
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ff9ebb",
}: TagChipRemoveProps) {
  const [tags, setTags] = useState(INITIAL);
  const [leaving, setLeaving] = useState<string | null>(null);
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;

  function remove(tag: string) {
    setLeaving(tag);
    window.setTimeout(() => {
      setTags((t) => t.filter((x) => x !== tag));
      setLeaving(null);
    }, 220);
  }

  return (
    <ul className={styles.chips} style={vars} aria-label="selected categories">
      {tags.map((tag, i) => (
        <li
          key={tag}
          className={[styles.chip, i === 2 ? styles.demo : "", leaving === tag ? styles.gone : ""].join(" ")}
        >
          <span>{tag}</span>
          <button
            type="button"
            className={styles.remove}
            aria-label={`remove ${tag}`}
            onClick={() => remove(tag)}
          >
            <svg viewBox="0 0 256 256" width={12} height={12} aria-hidden="true">
              <g fill="currentColor">
                <path d="M216,56V200a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V56A16,16,0,0,1,56,40H200A16,16,0,0,1,216,56Z" opacity=".2" />
                <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
              </g>
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}
