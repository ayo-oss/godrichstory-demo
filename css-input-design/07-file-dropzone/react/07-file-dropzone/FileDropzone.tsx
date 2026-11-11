import { useRef, useState } from "react";
import styles from "./FileDropzone.module.scss";

export type FileDropzoneProps = {
  text?: string;
  onFile?: (file: File) => void;
};

export default function FileDropzone({
  text = "여기로 파일을 끌어다 놓거나 클릭하세요",
  onFile,
}: FileDropzoneProps) {
  const [over, setOver] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (f?: File) => {
    if (!f) return;
    setName(f.name);
    onFile?.(f);
  };

  return (
    <div className={styles.drop}>
      <label
        className={over ? `${styles.zone} ${styles.over}` : styles.zone}
        onDragEnter={(e: any) => { e.preventDefault(); setOver(true); }}
        onDragOver={(e: any) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e: any) => {
          e.preventDefault();
          setOver(false);
          handleFile(e.dataTransfer?.files?.[0]);
        }}
      >
        <span className={styles.icon} aria-hidden="true">⬆</span>
        <span className={styles.text}>{text}</span>
        <input
          ref={inputRef}
          className={styles.input}
          type="file"
          onChange={(e: any) => handleFile(e.target.files?.[0])}
        />
      </label>
      <p className={styles.file} aria-live="polite">{name ? `선택됨: ${name}` : ""}</p>
    </div>
  );
}
