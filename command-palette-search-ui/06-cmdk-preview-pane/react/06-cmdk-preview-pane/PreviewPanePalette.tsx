import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PreviewPanePalette.module.scss";

export type PreviewDoc = { title: string; tag: string; lines: number[]; tint: string };

export type PreviewPanePaletteProps = {
  placeholder?: string;
  docs?: PreviewDoc[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type PaneVars = CSSProperties & { "--tint"?: string };
type KeyEvt = { key: string; preventDefault: () => void };

const DEFAULT_DOCS: PreviewDoc[] = [
  { title: "Weekly report", tag: "Report", lines: [90, 64], tint: "rgba(47, 109, 246, .1)" },
  { title: "Budget sheet", tag: "Budget", lines: [56, 88], tint: "rgba(23, 20, 26, .07)" },
  { title: "Meeting notes", tag: "Meeting", lines: [72, 50], tint: "rgba(76, 212, 166, .16)" },
];

export default function PreviewPanePalette({
  placeholder = "Search documents",
  docs = DEFAULT_DOCS,
  duration = 140,
  easing = "ease-out",
  color = "#2f6df6",
}: PreviewPanePaletteProps) {
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const doc = docs[at];
  const paneVars: PaneVars = { "--tint": doc.tint };

  return (
    <div className={styles.pal} style={vars} role="dialog" aria-modal="true" aria-label="Command palette">
      <div className={styles.bar}>
        <span className={styles.mag} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="13" height="13">
            <g fill="currentColor">
              <path d="M192 112a80 80 0 1 1-80-80a80 80 0 0 1 80 80" opacity=".2" />
              <path d="m229.66 218.34l-50.06-50.06a88.21 88.21 0 1 0-11.32 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72" />
            </g>
          </svg>
        </span>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="pp-list"
          aria-describedby="pp-pane"
          aria-activedescendant={`pp-o${at}`}
          aria-label={placeholder}
          placeholder={placeholder}
          autoComplete="off"
          onKeyDown={(e: KeyEvt) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setAt((a) => Math.max(0, Math.min(a + (e.key === "ArrowDown" ? 1 : -1), docs.length - 1)));
            } else if (e.key === "Enter") {
              e.preventDefault();
              setPicked(doc.title);
            } else if (e.key === "Escape") {
              inputRef.current?.focus({ preventScroll: true });
            }
          }}
        />
      </div>
      <div className={styles.body}>
        <div className={styles.list} id="pp-list" role="listbox" aria-label="Document list">
          {docs.map((d, i) => (
            <div
              key={d.title}
              id={`pp-o${i}`}
              className={`${styles.opt} ${i === at ? styles.isAt : ""}`}
              role="option"
              aria-selected={d.title === picked}
              tabIndex={-1}
              onMouseMove={() => setAt(i)}
              onClick={() => setPicked(d.title)}
            >
              {d.title}
            </div>
          ))}
        </div>
        {/* 줄이 바뀌면 패널 내용이 통째로 갈린다 — 페이드 없이 한 번에 (두 장이 겹쳐 비치지 않게) */}
        <div className={styles.pane} id="pp-pane" style={paneVars} key={doc.title}>
          <span className={styles.pvic} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="14" height="14">
              <g fill="currentColor">
                <path d="M208 88h-56V32Z" opacity=".2" />
                <path d="m213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v176a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16V88a8 8 0 0 0-2.34-5.66M160 51.31L188.69 80H160ZM200 216H56V40h88v48a8 8 0 0 0 8 8h48zm-32-80a8 8 0 0 1-8 8H96a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8m0 32a8 8 0 0 1-8 8H96a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8" />
              </g>
            </svg>
          </span>
          <p className={styles.pvt}>{doc.title}</p>
          {doc.lines.map((w, i) => <span className={styles.ln} style={{ width: `${w}%` }} key={i} />)}
          <span className={styles.tag}>{doc.tag}</span>
        </div>
      </div>
    </div>
  );
}
