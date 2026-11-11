import { useState } from "react";
import styles from "./TagInput.module.scss";

export type TagInputProps = {
  label?: string;
  initialTags?: string[];
};

export default function TagInput({ label = "키워드", initialTags = [] }: TagInputProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [draft, setDraft] = useState("");

  const add = (t: string) => {
    const v = t.trim();
    if (v) setTags((prev) => [...prev, v]);
  };

  const onKeyDown = (e: { key: string; preventDefault: () => void }) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
      setDraft("");
    } else if (e.key === "Backspace" && !draft && tags.length) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  return (
    <div className={styles.tags}>
      <label className={styles.label}>{label}</label>
      <ul className={styles.list} aria-label="추가된 태그">
        {tags.map((t, i) => (
          <li key={t + i} className={styles.chip}>
            <span>{t}</span>
            <button
              type="button"
              className={styles.remove}
              aria-label={`${t} 태그 삭제`}
              onClick={() => setTags((prev) => prev.filter((_, idx) => idx !== i))}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <input
        className={styles.input}
        type="text"
        placeholder="입력 후 Enter"
        value={draft}
        onChange={(e: any) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
