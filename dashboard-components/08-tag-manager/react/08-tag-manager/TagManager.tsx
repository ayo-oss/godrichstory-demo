import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TagManager.module.scss";

export type TagManagerProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TagManager({ duration = 220, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#fff7e6" }: TagManagerProps) {
  const [tags, setTags] = useState(["Design", "Urgent"]);
  const [value, setValue] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function addTag() {
    const v = value.trim();
    if (!v) return;
    setTags((t) => [...t, v]);
    setValue("");
  }
  function removeTag(tag: string) {
    setTags((t) => t.filter((x) => x !== tag));
  }

  return (
    <div className={styles.tg} style={vars}>
      <div className={styles.row}>
        <input
          className={styles.input}
          type="text"
          placeholder="Type a tag, press Enter"
          aria-label="New tag"
          value={value}
          onChange={(e: any) => setValue(e.target.value)}
          onKeyDown={(e: any) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
        />
        <button type="button" className={styles.add} aria-label="Add tag" onClick={addTag}>+</button>
      </div>
      <ul className={styles.list}>
        {tags.map((tag) => (
          <li key={tag} className={styles.chip}>
            {tag}
            <button type="button" className={styles.remove} aria-label={`Remove ${tag}`} onClick={() => removeTag(tag)}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
