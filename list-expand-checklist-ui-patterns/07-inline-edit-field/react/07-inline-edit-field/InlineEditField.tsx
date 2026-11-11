import { useRef, useState, type CSSProperties } from "react";
import styles from "./InlineEditField.module.scss";

export type InlineEditFieldProps = {
  label: string;
  initialValue: string;
  onSave?: (value: string) => void;
  /** 테두리·아이콘 전환 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 클릭하면 readOnly 를 풀고 focus, Enter·blur 로 저장, Escape 로 되돌린다 */
export default function InlineEditField({
  label,
  initialValue,
  onSave,
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: InlineEditFieldProps) {
  const [value, setValue] = useState(initialValue);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const before = useRef(initialValue);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const startEdit = () => {
    before.current = value;
    setEditing(true);
    requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.select(); });
  };
  const save = () => {
    setEditing(false);
    setSaved(true);
    onSave?.(value);
    setTimeout(() => setSaved(false), 900);
  };
  const cancel = () => { setValue(before.current ?? initialValue); setEditing(false); };

  return (
    <div className={`${styles.row} ${saved ? styles.savedFlash : ""}`} style={vars}>
      <label className={styles.label} htmlFor="ie-name-react">{label}</label>
      <div className={`${styles.field} ${editing ? styles.editing : ""}`}>
        <input
          id="ie-name-react"
          ref={inputRef}
          className={styles.input}
          type="text"
          readOnly={!editing}
          value={value}
          onChange={(e: any) => setValue(e.target.value)}
          onClick={() => !editing && startEdit()}
          onBlur={() => editing && save()}
          onKeyDown={(e: any) => {
            if (e.key === "Enter") { e.preventDefault(); save(); }
            else if (e.key === "Escape") cancel();
          }}
        />
        <button className={styles.toggle} type="button" aria-label={`${label} 편집`} onClick={() => (editing ? save() : startEdit())}>
          <svg className={`${styles.icon} ${saved ? styles.hidden : ""}`} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M221.66 90.34L192 120l-56-56l29.66-29.66a8 8 0 0 1 11.31 0L221.66 79a8 8 0 0 1 0 11.34" opacity=".2" /><path d="m227.31 73.37l-44.68-44.69a16 16 0 0 0-22.63 0L36.69 152A15.86 15.86 0 0 0 32 163.31V208a16 16 0 0 0 16 16h44.69a15.86 15.86 0 0 0 11.31-4.69L227.31 96a16 16 0 0 0 0-22.63M92.69 208H48v-44.69l88-88L180.69 120ZM192 108.68L147.31 64l24-24L216 84.68Z" /></g></svg>
          <svg className={`${styles.icon} ${styles.check} ${saved ? styles.shown : ""}`} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2" /><path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32" /></g></svg>
        </button>
      </div>
    </div>
  );
}
