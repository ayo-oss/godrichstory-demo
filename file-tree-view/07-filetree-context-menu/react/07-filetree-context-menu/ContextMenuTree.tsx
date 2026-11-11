import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ContextMenuTree.module.scss";

export type TreeNode = { name: string; kind?: "file" | "folder" };
export type MenuEntry = { label: string; icon?: "open" | "rename" | "copy" | "trash" };

export type ContextMenuTreeProps = {
  label?: string;
  nodes?: TreeNode[];
  items?: MenuEntry[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type MenuEvt = { clientX: number; clientY: number; preventDefault: () => void };

const DEFAULT_NODES: TreeNode[] = [
  { name: "hero.tsx" },
  { name: "button.tsx" },
  { name: "site", kind: "folder" },
  { name: "bundle.zip" },
];

const DEFAULT_ITEMS: MenuEntry[] = [
  { label: "열기", icon: "open" },
  { label: "이름 바꾸기", icon: "rename" },
  { label: "복사", icon: "copy" },
  { label: "삭제", icon: "trash" },
];

const ROW_H = 28;
const MENU_W = 152;

function fileIcon() {
  return (
    <svg viewBox="0 0 256 256" width="12" height="12" aria-hidden="true">
      <g fill="currentColor">
        <path d="M208 88h-56V32Z" opacity=".2" />
        <path d="m213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v72a8 8 0 0 0 16 0V40h88v48a8 8 0 0 0 8 8h48v120h-24a8 8 0 0 0 0 16h24a16 16 0 0 0 16-16V88a8 8 0 0 0-2.34-5.66M160 51.31L188.69 80H160Zm-12.19 145a20.82 20.82 0 0 1-9.19 15.23C133.43 215 127 216 121.13 216a61 61 0 0 1-15.13-2a8 8 0 1 1 4.3-15.41c4.38 1.2 15 2.7 19.55-.36c.88-.59 1.83-1.52 2.14-3.93c.35-2.67-.71-4.1-12.78-7.59c-9.35-2.7-25-7.23-23-23.11a20.56 20.56 0 0 1 9-14.95c11.84-8 30.71-3.31 32.83-2.76a8 8 0 0 1-4.07 15.48c-4.49-1.17-15.23-2.56-19.83.56a4.54 4.54 0 0 0-2 3.67c-.12.9-.14 1.09 1.11 1.9c2.31 1.49 6.45 2.68 10.45 3.84c9.79 2.83 26.35 7.66 24.11 24.97M88 152a8 8 0 0 1-8 8H68v48a8 8 0 0 1-16 0v-48H40a8 8 0 0 1 0-16h40a8 8 0 0 1 8 8" />
      </g>
    </svg>
  );
}

function folderIcon() {
  return (
    <svg viewBox="0 0 256 256" width="13" height="13" aria-hidden="true">
      <g fill="currentColor">
        <path d="M128 80H32V56a8 8 0 0 1 8-8h52.69a8 8 0 0 1 5.65 2.34Z" opacity=".2" />
        <path d="M216 72h-84.69L104 44.69A15.86 15.86 0 0 0 92.69 40H40a16 16 0 0 0-16 16v144.62A15.4 15.4 0 0 0 39.38 216h177.51A15.13 15.13 0 0 0 232 200.89V88a16 16 0 0 0-16-16M92.69 56l16 16H40V56ZM216 200H40V88h176Z" />
      </g>
    </svg>
  );
}

function menuIcon(kind: string) {
  if (kind === "rename") {
    return (
      <svg viewBox="0 0 256 256" width="13" height="13" aria-hidden="true">
        <g fill="currentColor">
          <path d="M221.66 90.34L192 120l-56-56l29.66-29.66a8 8 0 0 1 11.31 0L221.66 79a8 8 0 0 1 0 11.34" opacity=".2" />
          <path d="m227.31 73.37l-44.68-44.69a16 16 0 0 0-22.63 0L36.69 152A15.86 15.86 0 0 0 32 163.31V208a16 16 0 0 0 16 16h44.69a15.86 15.86 0 0 0 11.31-4.69L227.31 96a16 16 0 0 0 0-22.63M92.69 208H48v-44.69l88-88L180.69 120ZM192 108.68L147.31 64l24-24L216 84.68Z" />
        </g>
      </svg>
    );
  }
  if (kind === "copy") {
    return (
      <svg viewBox="0 0 256 256" width="13" height="13" aria-hidden="true">
        <g fill="currentColor">
          <path d="M216 40v128h-48V88H88V40Z" opacity=".2" />
          <path d="M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z" />
        </g>
      </svg>
    );
  }
  if (kind === "trash") {
    return (
      <svg viewBox="0 0 256 256" width="13" height="13" aria-hidden="true">
        <g fill="currentColor">
          <path d="M200 56v152a8 8 0 0 1-8 8H64a8 8 0 0 1-8-8V56Z" opacity=".2" />
          <path d="M216 48h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a8 8 0 0 0 0 16h8v144a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16V64h8a8 8 0 0 0 0-16M96 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm96 168H64V64h128Zm-80-104v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0m48 0v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 256 256" width="13" height="13" aria-hidden="true">
      <g fill="currentColor">
        <path d="M184 80v128a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8V80a8 8 0 0 1 8-8h128a8 8 0 0 1 8 8" opacity=".2" />
        <path d="M224 104a8 8 0 0 1-16 0V59.32l-66.33 66.34a8 8 0 0 1-11.32-11.32L196.68 48H152a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8Zm-40 24a8 8 0 0 0-8 8v72H48V80h72a8 8 0 0 0 0-16H48a16 16 0 0 0-16 16v128a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16v-72a8 8 0 0 0-8-8" />
      </g>
    </svg>
  );
}

export default function ContextMenuTree({
  label = "파일",
  nodes = DEFAULT_NODES,
  items = DEFAULT_ITEMS,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#ffd23f",
}: ContextMenuTreeProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [atRow, setAtRow] = useState(0);
  const [atItem, setAtItem] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 열릴 때: 첫 항목을 짚고 메뉴로 포커스를 옮긴다 (vanilla 의 move(0) + menu.focus 와 같은 순서)
  useEffect(() => {
    if (!pos) return;
    const list = itemRefs.current;
    if (list && list[0]) list[0].focus({ preventScroll: true });
    menuRef.current?.focus({ preventScroll: true });
  }, [pos]);

  function openMenu(e: MenuEvt, i: number) {
    e.preventDefault();
    const root = rootRef.current;
    if (!root) return;
    const r = root.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - r.left, root.offsetWidth - MENU_W));
    const y = Math.max(0, Math.min(e.clientY - r.top, window.innerHeight - 128));
    setAtRow(i);
    setAtItem(0);
    setPos({ x, y });
  }

  function close() {
    setPos(null);
    const rows = rowRefs.current;
    if (rows && rows[atRow]) rows[atRow]?.focus({ preventScroll: true });
  }

  function move(i: number) {
    const k = Math.max(0, Math.min(i, items.length - 1));
    setAtItem(k);
    const list = itemRefs.current;
    if (list && list[k]) list[k]?.focus({ preventScroll: true });
  }

  function onMenuKeyDown(e: KeyEvt) {
    if (e.key === "ArrowDown") { move(atItem + 1); e.preventDefault(); }
    else if (e.key === "ArrowUp") { move(atItem - 1); e.preventDefault(); }
    else if (e.key === "Enter") { close(); e.preventDefault(); }
    else if (e.key === "Escape") { close(); e.preventDefault(); }
  }

  const menuStyle: CSSProperties = pos ? { left: `${pos.x}px`, top: `${pos.y}px` } : {};
  const target = nodes[atRow] ? nodes[atRow].name : label;

  return (
    <div className={styles.cm} style={vars} ref={rootRef}>
      <ul
        className={styles.tree}
        role="tree"
        aria-label={label}
        tabIndex={0}
        aria-activedescendant={`cm-${atRow}`}
      >
        {nodes.map((n, i) => (
          <li
            key={n.name}
            id={`cm-${i}`}
            className={styles.item}
            role="treeitem"
            aria-level={1}
            aria-selected={i === atRow}
          >
            <div
              ref={(el: HTMLDivElement | null) => { if (rowRefs.current) rowRefs.current[i] = el; }}
              className={`${styles.row} ${i === atRow ? styles.isSelected : ""}`}
              tabIndex={-1}
              onClick={() => setAtRow(i)}
              onContextMenu={(e: MenuEvt) => openMenu(e, i)}
            >
              <span className={`${styles.ico} ${n.kind === "folder" ? styles.icoFolder : ""}`}>
                {n.kind === "folder" ? folderIcon() : fileIcon()}
              </span>
              <span className={styles.name}>{n.name}</span>
            </div>
          </li>
        ))}
      </ul>
      <div
        ref={menuRef}
        className={styles.menu}
        style={menuStyle}
        role="menu"
        aria-label={`${target} 메뉴`}
        hidden={!pos}
        tabIndex={0}
        onKeyDown={onMenuKeyDown}
      >
        <span className={styles.hl} style={{ transform: `translateY(${atItem * ROW_H}px)` }} aria-hidden="true" />
        {items.map((it, i) => (
          <button
            key={it.label}
            ref={(el: HTMLButtonElement | null) => { if (itemRefs.current) itemRefs.current[i] = el; }}
            className={styles.mi}
            type="button"
            role="menuitem"
            aria-current={i === atItem ? "true" : "false"}
            onMouseEnter={() => move(i)}
            onClick={() => close()}
          >
            <span className={styles.miIco}>{menuIcon(it.icon || "open")}</span>
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
