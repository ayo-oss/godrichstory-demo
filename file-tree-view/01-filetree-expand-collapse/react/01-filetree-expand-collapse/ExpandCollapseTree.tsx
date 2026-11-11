import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ExpandCollapseTree.module.scss";

export type TreeNode = { name: string; kids?: string[] };

export type ExpandCollapseTreeProps = {
  label?: string;
  nodes?: TreeNode[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type ClickEvt = { stopPropagation: () => void };

const DEFAULT_NODES: TreeNode[] = [
  { name: "components", kids: ["Button.tsx", "Modal.tsx"] },
  { name: "assets", kids: [] },
  { name: "main.css" },
  { name: "notes.md" },
];

type Row = { id: string; branch: boolean; owner: number; level: number };

// 아이콘은 vanilla 데모(01-filetree-expand-collapse/index.html)의 인라인 SVG 그대로다.
function Caret() {
  return (
    <svg viewBox="0 0 256 256" width="11" height="11">
      <g fill="currentColor">
        <path d="m176 128l-80 80V48Z" opacity=".2" />
        <path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z" />
      </g>
    </svg>
  );
}
function FolderShut() {
  return (
    <svg viewBox="0 0 256 256" width="14" height="14">
      <g fill="currentColor">
        <path d="M128 80H32V56a8 8 0 0 1 8-8h52.69a8 8 0 0 1 5.65 2.34Z" opacity=".2" />
        <path d="M216 72h-84.69L104 44.69A15.86 15.86 0 0 0 92.69 40H40a16 16 0 0 0-16 16v144.62A15.4 15.4 0 0 0 39.38 216h177.51A15.13 15.13 0 0 0 232 200.89V88a16 16 0 0 0-16-16M92.69 56l16 16H40V56ZM216 200H40V88h176Z" />
      </g>
    </svg>
  );
}
function FolderOpen() {
  return (
    <svg viewBox="0 0 256 256" width="14" height="14">
      <g fill="currentColor">
        <path d="M208 88v24H69.77a8 8 0 0 0-7.59 5.47L32 208V64a8 8 0 0 1 8-8h53.33a8 8 0 0 1 4.8 1.6L128 80h72a8 8 0 0 1 8 8" opacity=".2" />
        <path d="M245 110.64a16 16 0 0 0-13-6.64h-16V88a16 16 0 0 0-16-16h-69.33l-27.73-20.8a16.14 16.14 0 0 0-9.6-3.2H40a16 16 0 0 0-16 16v144a8 8 0 0 0 8 8h179.1a8 8 0 0 0 7.59-5.47l28.49-85.47a16.05 16.05 0 0 0-2.18-14.42M93.34 64l29.86 22.4A8 8 0 0 0 128 88h72v16H69.77a16 16 0 0 0-15.18 10.94L40 158.7V64Zm112 136H43.1l26.67-80H232Z" />
      </g>
    </svg>
  );
}
function FileTs() {
  return (
    <svg viewBox="0 0 256 256" width="13" height="13">
      <g fill="currentColor">
        <path d="M208 88h-56V32Z" opacity=".2" />
        <path d="m213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v72a8 8 0 0 0 16 0V40h88v48a8 8 0 0 0 8 8h48v120h-24a8 8 0 0 0 0 16h24a16 16 0 0 0 16-16V88a8 8 0 0 0-2.34-5.66M160 51.31L188.69 80H160Zm-12.19 145a20.82 20.82 0 0 1-9.19 15.23C133.43 215 127 216 121.13 216a61 61 0 0 1-15.13-2a8 8 0 1 1 4.3-15.41c4.38 1.2 15 2.7 19.55-.36c.88-.59 1.83-1.52 2.14-3.93c.35-2.67-.71-4.1-12.78-7.59c-9.35-2.7-25-7.23-23-23.11a20.56 20.56 0 0 1 9-14.95c11.84-8 30.71-3.31 32.83-2.76a8 8 0 0 1-4.07 15.48c-4.49-1.17-15.23-2.56-19.83.56a4.54 4.54 0 0 0-2 3.67c-.12.9-.14 1.09 1.11 1.9c2.31 1.49 6.45 2.68 10.45 3.84c9.79 2.83 26.35 7.66 24.11 24.97M88 152a8 8 0 0 1-8 8H68v48a8 8 0 0 1-16 0v-48H40a8 8 0 0 1 0-16h40a8 8 0 0 1 8 8" />
      </g>
    </svg>
  );
}
function FileCss() {
  return (
    <svg viewBox="0 0 256 256" width="13" height="13">
      <g fill="currentColor">
        <path d="M208 88h-56V32Z" opacity=".2" />
        <path d="M48 180c0 11 7.18 20 16 20a14.2 14.2 0 0 0 10.22-4.66a8 8 0 1 1 11.55 11.06A30 30 0 0 1 64 216c-17.65 0-32-16.15-32-36s14.35-36 32-36a30 30 0 0 1 21.77 9.6a8 8 0 1 1-11.55 11.06A14.24 14.24 0 0 0 64 160c-8.82 0-16 9-16 20m79.6-8.69c-4-1.16-8.14-2.35-10.45-3.84c-1.26-.81-1.23-1-1.12-1.9a4.54 4.54 0 0 1 2-3.67c4.6-3.12 15.35-1.73 19.83-.56a8 8 0 0 0 4.07-15.48c-2.12-.55-21-5.22-32.83 2.76a20.55 20.55 0 0 0-9 14.95c-2 15.88 13.64 20.41 23 23.11c12.07 3.49 13.13 4.92 12.78 7.59c-.31 2.41-1.26 3.34-2.14 3.93c-4.6 3.06-15.17 1.56-19.55.36a8 8 0 0 0-4.3 15.41a61.2 61.2 0 0 0 15.18 2c5.83 0 12.3-1 17.49-4.46a20.82 20.82 0 0 0 9.19-15.23c2.25-17.28-14.27-22.11-24.15-24.97m64 0c-4-1.16-8.14-2.35-10.45-3.84c-1.25-.81-1.23-1-1.12-1.9a4.54 4.54 0 0 1 2-3.67c4.6-3.12 15.34-1.73 19.82-.56a8 8 0 0 0 4.07-15.48c-2.11-.55-21-5.22-32.83 2.76a20.58 20.58 0 0 0-8.95 14.95c-2 15.88 13.65 20.41 23 23.11c12.06 3.49 13.12 4.92 12.78 7.59c-.31 2.41-1.26 3.34-2.15 3.93c-4.6 3.06-15.16 1.56-19.54.36a8 8 0 0 0-4.3 15.44a61.3 61.3 0 0 0 15.19 2c5.82 0 12.3-1 17.49-4.46a20.81 20.81 0 0 0 9.18-15.23c2.21-17.31-14.31-22.14-24.2-25ZM40 112V40a16 16 0 0 1 16-16h96a8 8 0 0 1 5.66 2.34l56 56A8 8 0 0 1 216 88v24a8 8 0 1 1-16 0V96h-48a8 8 0 0 1-8-8V40H56v72a8 8 0 0 1-16 0m120-32h28.68L160 51.31Z" />
      </g>
    </svg>
  );
}
function FileMd() {
  return (
    <svg viewBox="0 0 256 256" width="13" height="13">
      <g fill="currentColor">
        <path d="M208 88h-56V32Z" opacity=".2" />
        <path d="m213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v72a8 8 0 0 0 16 0V40h88v48a8 8 0 0 0 8 8h48v128a8 8 0 0 0 16 0V88a8 8 0 0 0-2.34-5.66M160 51.31L188.69 80H160ZM144 144h-16a8 8 0 0 0-8 8v56a8 8 0 0 0 8 8h16a36 36 0 0 0 0-72m0 56h-8v-40h8a20 20 0 0 1 0 40m-40-48v56a8 8 0 0 1-16 0v-30.62l-13.45 19.21a8 8 0 0 1-13.1 0L48 177.38V208a8 8 0 0 1-16 0v-56a8 8 0 0 1 14.55-4.59L68 178.05l21.45-30.64A8 8 0 0 1 104 152" />
      </g>
    </svg>
  );
}

function fileIcon(name: string) {
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  if (ext === "css" || ext === "scss") return <FileCss />;
  if (ext === "md") return <FileMd />;
  return <FileTs />;
}

export default function ExpandCollapseTree({
  label = "my-app",
  nodes = DEFAULT_NODES,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: ExpandCollapseTreeProps) {
  const [open, setOpen] = useState<boolean[]>(() => nodes.map(() => false));
  const [at, setAt] = useState(0);
  const treeRef = useRef<HTMLUListElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const id = (i: number, j?: number) => (j === undefined ? `ect-n${i}` : `ect-n${i}-${j}`);
  const isOpen = (i: number) => open[i] === true;

  // 보이는 줄만 화살표로 돈다 — 닫힌 폴더의 자식은 건너뛴다
  const rows: Row[] = [];
  nodes.forEach((n, i) => {
    rows.push({ id: id(i), branch: !!n.kids, owner: i, level: 1 });
    const kids = n.kids;
    if (kids && isOpen(i)) {
      kids.forEach((_k, j) => rows.push({ id: id(i, j), branch: false, owner: i, level: 2 }));
    }
  });
  const cur = at < rows.length ? at : rows.length - 1;
  const active = rows[cur];

  function setFold(i: number, on: boolean) {
    setOpen((o) => o.map((v, k) => (k === i ? on : v)));
  }

  function hit(i: number, branch: boolean) {
    const k = rows.findIndex((r) => r.id === id(i));
    if (k >= 0) setAt(k);
    if (branch) setFold(i, !isOpen(i));
    if (treeRef.current) treeRef.current.focus({ preventScroll: true });
  }

  function hitKid(i: number, j: number) {
    const k = rows.findIndex((r) => r.id === id(i, j));
    if (k >= 0) setAt(k);
    if (treeRef.current) treeRef.current.focus({ preventScroll: true });
  }

  function onKeyDown(e: KeyEvt) {
    const r = active;
    if (e.key === "ArrowDown") { setAt(Math.min(cur + 1, rows.length - 1)); e.preventDefault(); }
    else if (e.key === "ArrowUp") { setAt(Math.max(cur - 1, 0)); e.preventDefault(); }
    else if (e.key === "ArrowRight") {
      if (r && r.branch && !isOpen(r.owner)) setFold(r.owner, true);
      else setAt(Math.min(cur + 1, rows.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      if (r && r.branch && isOpen(r.owner)) setFold(r.owner, false);
      else if (r && r.level === 2) setAt(rows.findIndex((x) => x.id === id(r.owner)));
      e.preventDefault();
    } else if (e.key === "Home") { setAt(0); e.preventDefault(); }
    else if (e.key === "End") { setAt(rows.length - 1); e.preventDefault(); }
    else if (e.key === "Enter" || e.key === " ") {
      if (r && r.branch) setFold(r.owner, !isOpen(r.owner));
      e.preventDefault();
    }
  }

  return (
    <div className={styles.ft} style={vars}>
      <span className={styles.label} id="ect-label">{label}</span>
      <ul
        ref={treeRef}
        className={styles.tree}
        role="tree"
        aria-labelledby="ect-label"
        tabIndex={0}
        aria-activedescendant={active ? active.id : undefined}
        onKeyDown={onKeyDown}
      >
        {nodes.map((n, i) => {
          const kids = n.kids;
          const opened = isOpen(i);
          const cls = [
            styles.item,
            kids ? styles.branch : styles.leaf,
            opened ? styles.isOpen : "",
            active && active.id === id(i) ? styles.isAt : "",
          ].join(" ");
          return (
            <li key={n.name} id={id(i)} className={cls} role="treeitem" aria-level={1} aria-expanded={kids ? opened : undefined}>
              <div className={styles.row} onClick={(e: ClickEvt) => { e.stopPropagation(); hit(i, !!kids); }}>
                <span className={kids ? styles.caret : styles.caretBlank} aria-hidden="true">{kids ? <Caret /> : null}</span>
                <span className={styles.ico} aria-hidden="true">{kids ? (opened ? <FolderOpen /> : <FolderShut />) : fileIcon(n.name)}</span>
                <span className={styles.name}>{n.name}</span>
              </div>
              {kids ? (
                <div className={styles.kids}>
                  <div className={styles.kwrap}>
                    <ul className={styles.group} role="group" aria-label={n.name}>
                      {kids.map((k, j) => (
                        <li
                          key={k}
                          id={id(i, j)}
                          className={`${styles.item} ${styles.leaf} ${active && active.id === id(i, j) ? styles.isAt : ""}`}
                          role="treeitem"
                          aria-level={2}
                        >
                          <div className={styles.row} onClick={(e: ClickEvt) => { e.stopPropagation(); hitKid(i, j); }}>
                            <span className={styles.caretBlank} aria-hidden="true" />
                            <span className={styles.ico} aria-hidden="true">{fileIcon(k)}</span>
                            <span className={styles.name}>{k}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
