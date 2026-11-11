import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SearchFilterTree.module.scss";

export type NodeKind = "folder" | "ts" | "js" | "img" | "zip";
export type TreeNode = { name: string; kind: NodeKind; level: 1 | 2; parent?: string };

export type SearchFilterTreeProps = {
  placeholder?: string;
  nodes?: TreeNode[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type ChangeEvt = { target: { value: string } };

type Glyph = { dim: string; solid: string };

const PAGE = "M208 88h-56V32Z";

const GLYPH: Record<NodeKind, Glyph> = {
  folder: {
    dim: "M128 80H32V56a8 8 0 0 1 8-8h52.69a8 8 0 0 1 5.65 2.34Z",
    solid: "M216 72h-84.69L104 44.69A15.86 15.86 0 0 0 92.69 40H40a16 16 0 0 0-16 16v144.62A15.4 15.4 0 0 0 39.38 216h177.51A15.13 15.13 0 0 0 232 200.89V88a16 16 0 0 0-16-16M92.69 56l16 16H40V56ZM216 200H40V88h176Z",
  },
  ts: {
    dim: PAGE,
    solid: "m213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v72a8 8 0 0 0 16 0V40h88v48a8 8 0 0 0 8 8h48v120h-24a8 8 0 0 0 0 16h24a16 16 0 0 0 16-16V88a8 8 0 0 0-2.34-5.66M160 51.31L188.69 80H160Zm-12.19 145a20.82 20.82 0 0 1-9.19 15.23C133.43 215 127 216 121.13 216a61 61 0 0 1-15.13-2a8 8 0 1 1 4.3-15.41c4.38 1.2 15 2.7 19.55-.36c.88-.59 1.83-1.52 2.14-3.93c.35-2.67-.71-4.1-12.78-7.59c-9.35-2.7-25-7.23-23-23.11a20.56 20.56 0 0 1 9-14.95c11.84-8 30.71-3.31 32.83-2.76a8 8 0 0 1-4.07 15.48c-4.49-1.17-15.23-2.56-19.83.56a4.54 4.54 0 0 0-2 3.67c-.12.9-.14 1.09 1.11 1.9c2.31 1.49 6.45 2.68 10.45 3.84c9.79 2.83 26.35 7.66 24.11 24.97M88 152a8 8 0 0 1-8 8H68v48a8 8 0 0 1-16 0v-48H40a8 8 0 0 1 0-16h40a8 8 0 0 1 8 8",
  },
  js: {
    dim: PAGE,
    solid: "m213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v72a8 8 0 0 0 16 0V40h88v48a8 8 0 0 0 8 8h48v120h-24a8 8 0 0 0 0 16h24a16 16 0 0 0 16-16V88a8 8 0 0 0-2.34-5.66M160 51.31L188.69 80H160Zm-12.19 145a20.82 20.82 0 0 1-9.19 15.23C133.43 215 127 216 121.13 216a61 61 0 0 1-15.13-2a8 8 0 1 1 4.3-15.41c4.38 1.2 15 2.7 19.55-.36c.88-.59 1.83-1.52 2.14-3.93c.35-2.67-.71-4.1-12.78-7.59c-9.35-2.7-25-7.23-23-23.11a20.56 20.56 0 0 1 9-14.95c11.84-8 30.71-3.31 32.83-2.76a8 8 0 0 1-4.07 15.48c-4.49-1.17-15.23-2.56-19.83.56a4.54 4.54 0 0 0-2 3.67c-.12.9-.14 1.09 1.11 1.9c2.31 1.49 6.45 2.68 10.45 3.84c9.79 2.83 26.35 7.66 24.11 24.97M80 152v38a26 26 0 0 1-52 0a8 8 0 0 1 16 0a10 10 0 0 0 20 0v-38a8 8 0 0 1 16 0",
  },
  img: {
    dim: "m104 152l48 72H24l36-56l16.36 25.45Zm48-120v56h56Z",
    solid: "M110.66 147.56a8 8 0 0 0-13.32 0l-20.85 31.29l-9.76-15.18a8 8 0 0 0-13.46 0l-36 56A8 8 0 0 0 24 232h128a8 8 0 0 0 6.66-12.44ZM38.65 216L60 182.79l9.63 15a8 8 0 0 0 13.39.11l21-31.47L137.05 216Zm175-133.66l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v88a8 8 0 0 0 16 0V40h88v48a8 8 0 0 0 8 8h48v120h-8a8 8 0 0 0 0 16h8a16 16 0 0 0 16-16V88a8 8 0 0 0-2.34-5.66ZM160 51.31L188.69 80H160Z",
  },
  zip: {
    dim: PAGE,
    solid: "M184 144h-16a8 8 0 0 0-8 8v56a8 8 0 0 0 16 0v-8h8a28 28 0 0 0 0-56m0 40h-8v-24h8a12 12 0 0 1 0 24m-48-32v56a8 8 0 0 1-16 0v-56a8 8 0 0 1 16 0m-40 56a8 8 0 0 1-8 8H56a8 8 0 0 1-7-12l25.16-44H56a8 8 0 0 1 0-16h32a8 8 0 0 1 7 12l-25.21 44H88a8 8 0 0 1 8 8M213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v72a8 8 0 0 0 16 0V40h88v48a8 8 0 0 0 8 8h48v16a8 8 0 0 0 16 0V88a8 8 0 0 0-2.34-5.66M160 80V51.31L188.69 80Z",
  },
};

const SEARCH: Glyph = {
  dim: "M192 112a80 80 0 1 1-80-80a80 80 0 0 1 80 80",
  solid: "m229.66 218.34l-50.06-50.06a88.21 88.21 0 1 0-11.32 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72",
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

function Name({ name, q }: { name: string; q: string }) {
  const k = q ? name.toLowerCase().indexOf(q) : -1;
  if (k < 0) return <span className={styles.name}>{name}</span>;
  return (
    <span className={styles.name}>
      {name.slice(0, k)}
      <mark className={styles.mark}>{name.slice(k, k + q.length)}</mark>
      {name.slice(k + q.length)}
    </span>
  );
}

const DEFAULT_NODES: TreeNode[] = [
  { name: "site", kind: "folder", level: 1 },
  { name: "hero.tsx", kind: "ts", level: 2, parent: "site" },
  { name: "button.tsx", kind: "js", level: 2, parent: "site" },
  { name: "assets", kind: "folder", level: 1 },
  { name: "hero.png", kind: "img", level: 2, parent: "assets" },
  { name: "bundle.zip", kind: "zip", level: 1 },
];

export default function SearchFilterTree({
  placeholder = "파일 검색",
  nodes = DEFAULT_NODES,
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: SearchFilterTreeProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const treeRef = useRef<HTMLUListElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const q = query.trim().toLowerCase();

  function fileHit(n: TreeNode): boolean {
    return n.kind !== "folder" && (!q || n.name.toLowerCase().indexOf(q) >= 0);
  }
  function folderAlive(n: TreeNode): boolean {
    return nodes.some((c) => c.parent === n.name && fileHit(c));
  }

  const shown = nodes.map((n) => (n.kind === "folder" ? folderAlive(n) : fileHit(n)));
  const files = nodes.filter((n) => n.kind !== "folder");
  const hits = q ? files.filter(fileHit).length : files.length;
  const first = shown.indexOf(true);
  const activeId = `sf-n${first < 0 ? 0 : first}`;

  function onInputKey(e: KeyEvt) {
    if (e.key === "Escape") {
      setQuery("");
      treeRef.current?.focus({ preventScroll: true });
    }
  }

  function onTreeKey(e: KeyEvt) {
    if (e.key === "/") {
      inputRef.current?.focus({ preventScroll: true });
      e.preventDefault();
    }
  }

  return (
    <div className={styles.sf} style={vars}>
      <div className={styles.bar}>
        <span className={styles.ico} aria-hidden="true">
          <Icon glyph={SEARCH} size={13} />
        </span>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          aria-label={placeholder}
          onChange={(e: ChangeEvt) => setQuery(e.target.value)}
          onKeyDown={onInputKey}
        />
      </div>
      <div className={styles.count} aria-live="polite">{`${hits}건`}</div>
      <ul
        ref={treeRef}
        className={styles.tree}
        role="tree"
        aria-label={placeholder}
        tabIndex={0}
        aria-activedescendant={activeId}
        onKeyDown={onTreeKey}
      >
        {nodes.map((n, i) => {
          const folder = n.kind === "folder";
          const path = folder && !!q;
          return (
            <li
              key={n.name}
              id={`sf-n${i}`}
              className={`${styles.item} ${folder ? styles.isFolder : ""} ${path ? styles.isPath : ""}`}
              role="treeitem"
              aria-level={n.level}
              hidden={!shown[i]}
            >
              <div className={`${styles.row} ${n.level === 2 ? styles.rowDeep : ""}`}>
                <span className={styles.fi} aria-hidden="true">
                  <Icon glyph={GLYPH[n.kind]} size={folder ? 13 : 12} />
                </span>
                {folder ? <span className={styles.name}>{n.name}</span> : <Name name={n.name} q={q} />}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
