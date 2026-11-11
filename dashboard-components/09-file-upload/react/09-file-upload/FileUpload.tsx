import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FileUpload.module.scss";

export type FileUploadProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type UploadFile = { id: string; name: string; done: boolean };

export default function FileUpload({ duration = 600, easing = "ease-out", color = "#2f6df6" }: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function addFiles(list: FileList | null) {
    if (!list) return;
    Array.from(list).forEach((f) => {
      const id = `${f.name}-${Date.now()}-${Math.random()}`;
      setFiles((prev) => [...prev, { id, name: f.name, done: false }]);
      setTimeout(() => setFiles((prev) => prev.map((x) => (x.id === id ? { ...x, done: true } : x))), 900);
    });
  }
  function onDrop(e: any) {
    e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files);
  }

  return (
    <div className={styles.fu} style={vars}>
      <label
        className={`${styles.zone} ${over ? styles.over : ""}`}
        tabIndex={0}
        onDragOver={(e: any) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <span className={styles.ic}>⭱</span>
        <span className={styles.hint}>Drag and drop, or click to choose</span>
        <input ref={inputRef} type="file" multiple hidden onChange={(e: any) => { addFiles(e.target.files); e.target.value = ""; }} />
      </label>
      <ul className={styles.files}>
        {files.map((f) => (
          <li key={f.id} className={styles.file}>
            <span className={styles.name}>{f.name}</span>
            <span className={`${styles.track} ${f.done ? styles.trackDone : ""}`}>
              <span className={styles.fill} style={{ transform: f.done ? "scaleX(1)" : "scaleX(0)" }} />
            </span>
            <span className={`${styles.check} ${f.done ? styles.checkDone : ""}`}>✓</span>
            <button type="button" className={styles.remove} aria-label={`Remove ${f.name}`} onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
