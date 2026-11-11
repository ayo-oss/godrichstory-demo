import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SizeBarTree.module.scss";

export type SizeNode = { name: string; gb: number; folder?: boolean };

export type SizeBarTreeProps = {
  label?: string;
  hint?: string;
  nodes?: SizeNode[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type BarVars = CSSProperties & { "--v"?: string };
type KeyEvt = { key: string; preventDefault: () => void };

const DEFAULT_NODES: SizeNode[] = [
  { name: "media", gb: 4.2, folder: true },
  { name: "docs", gb: 1.1, folder: true },
  { name: "src", gb: 0.6, folder: true },
  { name: "backup.zip", gb: 0.9 },
];

function folderIcon() {
  return (
    <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
      <g fill="currentColor">
        <path d="M128 80H32V56a8 8 0 0 1 8-8h52.69a8 8 0 0 1 5.65 2.34Z" opacity=".2" />
        <path d="M216 72h-84.69L104 44.69A15.86 15.86 0 0 0 92.69 40H40a16 16 0 0 0-16 16v144.62A15.4 15.4 0 0 0 39.38 216h177.51A15.13 15.13 0 0 0 232 200.89V88a16 16 0 0 0-16-16M92.69 56l16 16H40V56ZM216 200H40V88h176Z" />
      </g>
    </svg>
  );
}

function fileIcon() {
  return (
    <svg viewBox="0 0 256 256" width="13" height="13" aria-hidden="true">
      <g fill="currentColor">
        <path d="M208 88h-56V32Z" opacity=".2" />
        <path d="M184 144h-16a8 8 0 0 0-8 8v56a8 8 0 0 0 16 0v-8h8a28 28 0 0 0 0-56m0 40h-8v-24h8a12 12 0 0 1 0 24m-48-32v56a8 8 0 0 1-16 0v-56a8 8 0 0 1 16 0m-40 56a8 8 0 0 1-8 8H56a8 8 0 0 1-7-12l25.16-44H56a8 8 0 0 1 0-16h32a8 8 0 0 1 7 12l-25.21 44H88a8 8 0 0 1 8 8M213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v72a8 8 0 0 0 16 0V40h88v48a8 8 0 0 0 8 8h48v16a8 8 0 0 0 16 0V88a8 8 0 0 0-2.34-5.66M160 80V51.31L188.69 80Z" />
      </g>
    </svg>
  );
}

export default function SizeBarTree({
  label = "저장소",
  hint = "폴더를 누르면 그 기준으로 다시 잽니다",
  nodes = DEFAULT_NODES,
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
}: SizeBarTreeProps) {
  const [base, setBase] = useState(-1);
  const [at, setAt] = useState(0);
  const treeRef = useRef<HTMLUListElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const total = nodes.reduce((s, n) => s + n.gb, 0);
  const top = nodes.reduce((m, n) => Math.max(m, n.gb), 0) || 1;
  const baseV = base >= 0 && nodes[base] ? nodes[base].gb : top;

  // 기준이 없으면 최대 폴더를 82% 로, 기준이 있으면 그 폴더를 100% 로 다시 잰다.
  function share(n: SizeNode) {
    return base >= 0 ? Math.min(n.gb / baseV, 1) : (n.gb / top) * 0.82;
  }

  const title = base >= 0 && nodes[base]
    ? `기준: ${nodes[base].name} ${nodes[base].gb} GB`
    : `${label} ${total.toFixed(1)} GB`;

  function pick(i: number) {
    setAt(i);
    setBase((b) => (b === i ? -1 : i));
    treeRef.current?.focus({ preventScroll: true });
  }

  function onKeyDown(e: KeyEvt) {
    if (e.key === "ArrowDown") { setAt((a) => Math.min(a + 1, nodes.length - 1)); e.preventDefault(); }
    else if (e.key === "ArrowUp") { setAt((a) => Math.max(a - 1, 0)); e.preventDefault(); }
    else if (e.key === "Home") { setAt(0); e.preventDefault(); }
    else if (e.key === "End") { setAt(nodes.length - 1); e.preventDefault(); }
    else if (e.key === "Enter" || e.key === " ") { setBase((b) => (b === at ? -1 : at)); e.preventDefault(); }
  }

  return (
    <div className={styles.zb} style={vars}>
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        <span className={styles.hint}>{hint}</span>
      </div>
      <ul
        ref={treeRef}
        className={styles.tree}
        role="tree"
        aria-label={label}
        tabIndex={0}
        aria-activedescendant={`zb-${at}`}
        onKeyDown={onKeyDown}
      >
        {nodes.map((n, i) => {
          const s = share(n);
          const bar: BarVars = { "--v": String(s) };
          return (
            <li
              key={n.name}
              id={`zb-${i}`}
              className={`${styles.item} ${base === i ? styles.isBase : ""} ${at === i ? styles.isAt : ""}`}
              role="treeitem"
              aria-level={1}
              aria-selected={base === i}
            >
              <div className={styles.row} onClick={() => pick(i)} tabIndex={-1}>
                <span className={`${styles.ico} ${n.folder ? styles.icoFolder : ""}`} aria-hidden="true">
                  {n.folder ? folderIcon() : fileIcon()}
                </span>
                <span className={styles.name}>{n.name}</span>
                <span className={styles.size} aria-hidden="true">{n.gb} GB</span>
              </div>
              <div
                className={styles.bar}
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(s * 100)}
                aria-label={`${n.name} 용량`}
                style={bar}
              >
                <i className={styles.fill} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
