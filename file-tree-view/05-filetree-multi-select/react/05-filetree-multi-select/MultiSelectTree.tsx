import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MultiSelectTree.module.scss";

export type FileKind = "img" | "pdf" | "zip" | "js" | "css" | "md";
export type FileItem = { name: string; kind: FileKind };

export type MultiSelectTreeProps = {
  label?: string;
  items?: FileItem[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type ClickEvt = { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean };

type Glyph = { dim: string; solid: string };

const PAGE = "M208 88h-56V32Z";

const GLYPH: Record<FileKind, Glyph> = {
  img: {
    dim: "m104 152l48 72H24l36-56l16.36 25.45Zm48-120v56h56Z",
    solid: "M110.66 147.56a8 8 0 0 0-13.32 0l-20.85 31.29l-9.76-15.18a8 8 0 0 0-13.46 0l-36 56A8 8 0 0 0 24 232h128a8 8 0 0 0 6.66-12.44ZM38.65 216L60 182.79l9.63 15a8 8 0 0 0 13.39.11l21-31.47L137.05 216Zm175-133.66l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v88a8 8 0 0 0 16 0V40h88v48a8 8 0 0 0 8 8h48v120h-8a8 8 0 0 0 0 16h8a16 16 0 0 0 16-16V88a8 8 0 0 0-2.34-5.66ZM160 51.31L188.69 80H160Z",
  },
  pdf: {
    dim: PAGE,
    solid: "M52 144H36a8 8 0 0 0-8 8v56a8 8 0 0 0 8 8h16a36 36 0 0 0 0-72m0 56h-8v-40h8a20 20 0 0 1 0 40m169.53-4.91a8 8 0 0 1 .25 11.31A30.06 30.06 0 0 1 200 216c-17.65 0-32-16.15-32-36s14.35-36 32-36a30.06 30.06 0 0 1 21.78 9.6a8 8 0 0 1-11.56 11.06A14.24 14.24 0 0 0 200 160c-8.82 0-16 9-16 20s7.18 20 16 20a14.18 14.18 0 0 0 10.22-4.66a8 8 0 0 1 11.31-.25M128 144c-17.64 0-32 16.15-32 36s14.36 36 32 36s32-16.15 32-36s-14.36-36-32-36m0 56c-8.82 0-16-9-16-20s7.18-20 16-20s16 9 16 20s-7.18 20-16 20m-80-80a8 8 0 0 0 8-8V40h88v48a8 8 0 0 0 8 8h48v16a8 8 0 0 0 16 0V88a8 8 0 0 0-2.34-5.66l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v72a8 8 0 0 0 8 8m112-68.69L188.69 80H160Z",
  },
  zip: {
    dim: PAGE,
    solid: "M184 144h-16a8 8 0 0 0-8 8v56a8 8 0 0 0 16 0v-8h8a28 28 0 0 0 0-56m0 40h-8v-24h8a12 12 0 0 1 0 24m-48-32v56a8 8 0 0 1-16 0v-56a8 8 0 0 1 16 0m-40 56a8 8 0 0 1-8 8H56a8 8 0 0 1-7-12l25.16-44H56a8 8 0 0 1 0-16h32a8 8 0 0 1 7 12l-25.21 44H88a8 8 0 0 1 8 8M213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v72a8 8 0 0 0 16 0V40h88v48a8 8 0 0 0 8 8h48v16a8 8 0 0 0 16 0V88a8 8 0 0 0-2.34-5.66M160 80V51.31L188.69 80Z",
  },
  js: {
    dim: PAGE,
    solid: "m213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v72a8 8 0 0 0 16 0V40h88v48a8 8 0 0 0 8 8h48v120h-24a8 8 0 0 0 0 16h24a16 16 0 0 0 16-16V88a8 8 0 0 0-2.34-5.66M160 51.31L188.69 80H160Zm-12.19 145a20.82 20.82 0 0 1-9.19 15.23C133.43 215 127 216 121.13 216a61 61 0 0 1-15.13-2a8 8 0 1 1 4.3-15.41c4.38 1.2 15 2.7 19.55-.36c.88-.59 1.83-1.52 2.14-3.93c.35-2.67-.71-4.1-12.78-7.59c-9.35-2.7-25-7.23-23-23.11a20.56 20.56 0 0 1 9-14.95c11.84-8 30.71-3.31 32.83-2.76a8 8 0 0 1-4.07 15.48c-4.49-1.17-15.23-2.56-19.83.56a4.54 4.54 0 0 0-2 3.67c-.12.9-.14 1.09 1.11 1.9c2.31 1.49 6.45 2.68 10.45 3.84c9.79 2.83 26.35 7.66 24.11 24.97M80 152v38a26 26 0 0 1-52 0a8 8 0 0 1 16 0a10 10 0 0 0 20 0v-38a8 8 0 0 1 16 0",
  },
  css: {
    dim: PAGE,
    solid: "M48 180c0 11 7.18 20 16 20a14.2 14.2 0 0 0 10.22-4.66a8 8 0 1 1 11.55 11.06A30 30 0 0 1 64 216c-17.65 0-32-16.15-32-36s14.35-36 32-36a30 30 0 0 1 21.77 9.6a8 8 0 1 1-11.55 11.06A14.24 14.24 0 0 0 64 160c-8.82 0-16 9-16 20m79.6-8.69c-4-1.16-8.14-2.35-10.45-3.84c-1.26-.81-1.23-1-1.12-1.9a4.54 4.54 0 0 1 2-3.67c4.6-3.12 15.35-1.73 19.83-.56a8 8 0 0 0 4.07-15.48c-2.12-.55-21-5.22-32.83 2.76a20.55 20.55 0 0 0-9 14.95c-2 15.88 13.64 20.41 23 23.11c12.07 3.49 13.13 4.92 12.78 7.59c-.31 2.41-1.26 3.34-2.14 3.93c-4.6 3.06-15.17 1.56-19.55.36a8 8 0 0 0-4.3 15.41a61.2 61.2 0 0 0 15.18 2c5.83 0 12.3-1 17.49-4.46a20.82 20.82 0 0 0 9.19-15.23c2.25-17.28-14.27-22.11-24.15-24.97m64 0c-4-1.16-8.14-2.35-10.45-3.84c-1.25-.81-1.23-1-1.12-1.9a4.54 4.54 0 0 1 2-3.67c4.6-3.12 15.34-1.73 19.82-.56a8 8 0 0 0 4.07-15.48c-2.11-.55-21-5.22-32.83 2.76a20.58 20.58 0 0 0-8.95 14.95c-2 15.88 13.65 20.41 23 23.11c12.06 3.49 13.12 4.92 12.78 7.59c-.31 2.41-1.26 3.34-2.15 3.93c-4.6 3.06-15.16 1.56-19.54.36a8 8 0 0 0-4.3 15.44a61.3 61.3 0 0 0 15.19 2c5.82 0 12.3-1 17.49-4.46a20.81 20.81 0 0 0 9.18-15.23c2.21-17.31-14.31-22.14-24.2-25ZM40 112V40a16 16 0 0 1 16-16h96a8 8 0 0 1 5.66 2.34l56 56A8 8 0 0 1 216 88v24a8 8 0 1 1-16 0V96h-48a8 8 0 0 1-8-8V40H56v72a8 8 0 0 1-16 0m120-32h28.68L160 51.31Z",
  },
  md: {
    dim: PAGE,
    solid: "m213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v72a8 8 0 0 0 16 0V40h88v48a8 8 0 0 0 8 8h48v128a8 8 0 0 0 16 0V88a8 8 0 0 0-2.34-5.66M160 51.31L188.69 80H160ZM144 144h-16a8 8 0 0 0-8 8v56a8 8 0 0 0 8 8h16a36 36 0 0 0 0-72m0 56h-8v-40h8a20 20 0 0 1 0 40m-40-48v56a8 8 0 0 1-16 0v-30.62l-13.45 19.21a8 8 0 0 1-13.1 0L48 177.38V208a8 8 0 0 1-16 0v-56a8 8 0 0 1 14.55-4.59L68 178.05l21.45-30.64A8 8 0 0 1 104 152",
  },
};

const CHECK: Glyph = {
  dim: "M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16",
  solid: "m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32",
};

function Icon({ glyph, size }: { glyph: Glyph; size: number }) {
  return (
    <svg viewBox="0 0 256 256" width={size} height={size}>
      <g fill="currentColor">
        <path d={glyph.dim} opacity=".2" />
        <path d={glyph.solid} />
      </g>
    </svg>
  );
}

const DEFAULT_ITEMS: FileItem[] = [
  { name: "hero.jpg", kind: "img" },
  { name: "resume.pdf", kind: "pdf" },
  { name: "bundle.zip", kind: "zip" },
  { name: "main.js", kind: "js" },
  { name: "style.css", kind: "css" },
  { name: "notes.md", kind: "md" },
];

export default function MultiSelectTree({
  label = "자료",
  items = DEFAULT_ITEMS,
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: MultiSelectTreeProps) {
  const [sel, setSel] = useState<boolean[]>(items.map(() => false));
  const [anchor, setAnchor] = useState(0);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const count = sel.filter(Boolean).length;
  const last = items.length - 1;

  function hit(i: number, e: ClickEvt) {
    if (e.shiftKey) {
      const a = Math.min(anchor, i);
      const z = Math.max(anchor, i);
      setSel(items.map((_, k) => k >= a && k <= z));
    } else if (e.ctrlKey || e.metaKey) {
      setSel((prev) => prev.map((v, k) => (k === i ? !v : v)));
      setAnchor(i);
    } else {
      setSel(items.map((_, k) => k === i));
      setAnchor(i);
    }
    setActive(i);
    listRef.current?.focus({ preventScroll: true });
  }

  function onKey(e: KeyEvt) {
    if (e.key === "ArrowDown") {
      setActive((a) => Math.min(a + 1, last));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setActive((a) => Math.max(a - 1, 0));
      e.preventDefault();
    } else if (e.key === " ") {
      setSel((prev) => prev.map((v, k) => (k === active ? !v : v)));
      setAnchor(active);
      e.preventDefault();
    }
  }

  return (
    <div className={styles.ms} style={vars}>
      <div className={styles.head}>
        <span className={styles.title} id="ms-title">{`${label} ${items.length}개`}</span>
        <span className={`${styles.badge} ${count > 0 ? styles.badgeOn : ""}`} aria-live="polite">
          {`${count}개 선택`}
        </span>
      </div>
      <ul
        ref={listRef}
        className={styles.list}
        role="tree"
        aria-labelledby="ms-title"
        aria-multiselectable="true"
        tabIndex={0}
        aria-activedescendant={`ms-o${active}`}
        onKeyDown={onKey}
      >
        {items.map((it, i) => (
          <li
            key={it.name}
            id={`ms-o${i}`}
            className={`${styles.item} ${sel[i] ? styles.isSel : ""} ${i === active ? styles.isActive : ""}`}
            role="treeitem"
            aria-level={1}
            aria-selected={sel[i]}
          >
            <div className={styles.row} onClick={(e: ClickEvt) => hit(i, e)}>
              <span className={styles.ico} aria-hidden="true">
                <Icon glyph={GLYPH[it.kind]} size={13} />
              </span>
              <span className={styles.name}>{it.name}</span>
              <span className={styles.ok} aria-hidden="true">
                <Icon glyph={CHECK} size={12} />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
