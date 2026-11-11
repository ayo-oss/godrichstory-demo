import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DropzoneCard.module.scss";

export type DropzoneCardProps = {
  idle?: string;
  got?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type DropEvt = { preventDefault: () => void; dataTransfer: { files: { name: string }[] } | null };
type FileEvt = { target: { files: { name: string }[] | null } };

export default function DropzoneCard({
  idle = "Drop a file here, or click to choose one",
  got = "Got {f}",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: DropzoneCardProps) {
  const [msg, setMsg] = useState(idle);
  const [over, setOver] = useState(false);
  const [loop, setLoop] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function took(name: string) {
    setLoop(false);
    setOver(false);
    setMsg(name ? got.replace("{f}", name) : idle);
  }

  return (
    <section className={`${styles.dz} ${loop ? styles.isDemo : ""}`} style={vars}>
      <div
        className={`${styles.zone} ${over ? styles.isOver : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e: KeyEvt) => {
          if (e.key === "Enter" || e.key === " ") { inputRef.current?.click(); e.preventDefault(); }
        }}
        onDragOver={(e: DropEvt) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e: DropEvt) => {
          e.preventDefault();
          took(e.dataTransfer && e.dataTransfer.files[0] ? e.dataTransfer.files[0].name : "");
        }}
      >
        <span className={styles.file} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="1em" height="1em">
            <g fill="currentColor">
              <path d="M208 88h-56V32Z" opacity=".2" />
              <path d="m213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v176a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16V88a8 8 0 0 0-2.34-5.66M160 51.31L188.69 80H160ZM200 216H56V40h88v48a8 8 0 0 0 8 8h48zm-32-80a8 8 0 0 1-8 8H96a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8m0 32a8 8 0 0 1-8 8H96a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8" />
            </g>
          </svg>
        </span>
        <span className={styles.cloud} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="1em" height="1em">
            <g fill="currentColor">
              <path d="M240 128a80 80 0 0 1-80 80H72A56 56 0 1 1 85.92 97.74v.1A80 80 0 0 1 240 128" opacity=".2" />
              <path d="M178.34 165.66L160 147.31V208a8 8 0 0 1-16 0v-60.69l-18.34 18.35a8 8 0 0 1-11.32-11.32l32-32a8 8 0 0 1 11.32 0l32 32a8 8 0 0 1-11.32 11.32M160 40a88.08 88.08 0 0 0-78.71 48.68A64 64 0 1 0 72 216h40a8 8 0 0 0 0-16H72a48 48 0 0 1 0-96c1.1 0 2.2 0 3.29.12A88 88 0 0 0 72 128a8 8 0 0 0 16 0a72 72 0 1 1 100.8 66a8 8 0 0 0 3.2 15.34a7.9 7.9 0 0 0 3.2-.68A88 88 0 0 0 160 40" />
            </g>
          </svg>
        </span>
      </div>
      <p className={styles.msg} aria-live="polite">{msg}</p>
      <input
        className={styles.input}
        ref={inputRef}
        type="file"
        hidden
        onChange={(e: FileEvt) => took(e.target.files && e.target.files[0] ? e.target.files[0].name : "")}
      />
    </section>
  );
}
