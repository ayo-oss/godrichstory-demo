import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ActiveHighlightTree.module.scss";

export type TreeKind = "folder" | "image" | "js" | "css";
export type TreeNode = { name: string; path: string; level: number; kind: TreeKind };

export type ActiveHighlightTreeProps = {
  label?: string;
  nodes?: TreeNode[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--at"?: string;
};
type KeyEvt = { key: string; preventDefault: () => void };

function Icon({ kind }: { kind: TreeKind }) {
  if (kind === "folder") {
    return (
      <svg viewBox="0 0 256 256" width="14" height="14">
        <g fill="currentColor">
          <path d="M128 80H32V56a8 8 0 0 1 8-8h52.69a8 8 0 0 1 5.65 2.34Z" opacity=".2" />
          <path d="M216 72h-84.69L104 44.69A15.86 15.86 0 0 0 92.69 40H40a16 16 0 0 0-16 16v144.62A15.4 15.4 0 0 0 39.38 216h177.51A15.13 15.13 0 0 0 232 200.89V88a16 16 0 0 0-16-16M92.69 56l16 16H40V56ZM216 200H40V88h176Z" />
        </g>
      </svg>
    );
  }
  if (kind === "image") {
    return (
      <svg viewBox="0 0 256 256" width="13" height="13">
        <g fill="currentColor">
          <path d="m104 152l48 72H24l36-56l16.36 25.45Zm48-120v56h56Z" opacity=".2" />
          <path d="M110.66 147.56a8 8 0 0 0-13.32 0l-20.85 31.29l-9.76-15.18a8 8 0 0 0-13.46 0l-36 56A8 8 0 0 0 24 232h128a8 8 0 0 0 6.66-12.44ZM38.65 216L60 182.79l9.63 15a8 8 0 0 0 13.39.11l21-31.47L137.05 216Zm175-133.66l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v88a8 8 0 0 0 16 0V40h88v48a8 8 0 0 0 8 8h48v120h-8a8 8 0 0 0 0 16h8a16 16 0 0 0 16-16V88a8 8 0 0 0-2.34-5.66ZM160 51.31L188.69 80H160Z" />
        </g>
      </svg>
    );
  }
  if (kind === "js") {
    return (
      <svg viewBox="0 0 256 256" width="13" height="13">
        <g fill="currentColor">
          <path d="M208 88h-56V32Z" opacity=".2" />
          <path d="m213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v72a8 8 0 0 0 16 0V40h88v48a8 8 0 0 0 8 8h48v120h-24a8 8 0 0 0 0 16h24a16 16 0 0 0 16-16V88a8 8 0 0 0-2.34-5.66M160 51.31L188.69 80H160Zm-12.19 145a20.82 20.82 0 0 1-9.19 15.23C133.43 215 127 216 121.13 216a61 61 0 0 1-15.13-2a8 8 0 1 1 4.3-15.41c4.38 1.2 15 2.7 19.55-.36c.88-.59 1.83-1.52 2.14-3.93c.35-2.67-.71-4.1-12.78-7.59c-9.35-2.7-25-7.23-23-23.11a20.56 20.56 0 0 1 9-14.95c11.84-8 30.71-3.31 32.83-2.76a8 8 0 0 1-4.07 15.48c-4.49-1.17-15.23-2.56-19.83.56a4.54 4.54 0 0 0-2 3.67c-.12.9-.14 1.09 1.11 1.9c2.31 1.49 6.45 2.68 10.45 3.84c9.79 2.83 26.35 7.66 24.11 24.97M80 152v38a26 26 0 0 1-52 0a8 8 0 0 1 16 0a10 10 0 0 0 20 0v-38a8 8 0 0 1 16 0" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 256 256" width="13" height="13">
      <g fill="currentColor">
        <path d="M208 88h-56V32Z" opacity=".2" />
        <path d="M48 180c0 11 7.18 20 16 20a14.2 14.2 0 0 0 10.22-4.66a8 8 0 1 1 11.55 11.06A30 30 0 0 1 64 216c-17.65 0-32-16.15-32-36s14.35-36 32-36a30 30 0 0 1 21.77 9.6a8 8 0 1 1-11.55 11.06A14.24 14.24 0 0 0 64 160c-8.82 0-16 9-16 20m79.6-8.69c-4-1.16-8.14-2.35-10.45-3.84c-1.26-.81-1.23-1-1.12-1.9a4.54 4.54 0 0 1 2-3.67c4.6-3.12 15.35-1.73 19.83-.56a8 8 0 0 0 4.07-15.48c-2.12-.55-21-5.22-32.83 2.76a20.55 20.55 0 0 0-9 14.95c-2 15.88 13.64 20.41 23 23.11c12.07 3.49 13.13 4.92 12.78 7.59c-.31 2.41-1.26 3.34-2.14 3.93c-4.6 3.06-15.17 1.56-19.55.36a8 8 0 0 0-4.3 15.41a61.2 61.2 0 0 0 15.18 2c5.83 0 12.3-1 17.49-4.46a20.82 20.82 0 0 0 9.19-15.23c2.25-17.28-14.27-22.11-24.15-24.97m64 0c-4-1.16-8.14-2.35-10.45-3.84c-1.25-.81-1.23-1-1.12-1.9a4.54 4.54 0 0 1 2-3.67c4.6-3.12 15.34-1.73 19.82-.56a8 8 0 0 0 4.07-15.48c-2.11-.55-21-5.22-32.83 2.76a20.58 20.58 0 0 0-8.95 14.95c-2 15.88 13.65 20.41 23 23.11c12.06 3.49 13.12 4.92 12.78 7.59c-.31 2.41-1.26 3.34-2.15 3.93c-4.6 3.06-15.16 1.56-19.54.36a8 8 0 0 0-4.3 15.44a61.3 61.3 0 0 0 15.19 2c5.82 0 12.3-1 17.49-4.46a20.81 20.81 0 0 0 9.18-15.23c2.21-17.31-14.31-22.14-24.2-25ZM40 112V40a16 16 0 0 1 16-16h96a8 8 0 0 1 5.66 2.34l56 56A8 8 0 0 1 216 88v24a8 8 0 1 1-16 0V96h-48a8 8 0 0 1-8-8V40H56v72a8 8 0 0 1-16 0m120-32h28.68L160 51.31Z" />
      </g>
    </svg>
  );
}

const DEFAULT_NODES: TreeNode[] = [
  { name: "portfolio", path: "portfolio", level: 1, kind: "folder" },
  { name: "site", path: "portfolio / site", level: 2, kind: "folder" },
  { name: "cover.jpg", path: "portfolio / site / cover.jpg", level: 3, kind: "image" },
  { name: "main.js", path: "portfolio / site / main.js", level: 3, kind: "js" },
  { name: "style.css", path: "portfolio / site / style.css", level: 3, kind: "css" },
];

export default function ActiveHighlightTree({
  label = "portfolio",
  nodes = DEFAULT_NODES,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ActiveHighlightTreeProps) {
  const [at, setAt] = useState(0);
  const treeRef = useRef<HTMLUListElement>(null);
  const last = nodes.length - 1;
  const cur = Math.max(0, Math.min(at, last));
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--at": String(cur),
  };
  const segs = (nodes[cur] ? nodes[cur].path : "").split(" / ");
  const head = segs.slice(0, -1).join(" / ");
  const tail = segs[segs.length - 1];

  function pick(i: number) {
    setAt(Math.max(0, Math.min(i, last)));
    treeRef.current?.focus({ preventScroll: true });
  }

  return (
    <div className={styles.root} style={vars}>
      <div className={styles.crumbs}>
        <span className={styles.crumb} id="aht-crumb">
          {head ? `${head} / ` : ""}
          <b>{tail}</b>
        </span>
      </div>
      <ul
        ref={treeRef}
        className={styles.tree}
        role="tree"
        aria-label={label}
        tabIndex={0}
        aria-activedescendant={`aht-n${cur}`}
        aria-describedby="aht-crumb"
        onKeyDown={(e: KeyEvt) => {
          if (e.key === "ArrowDown") { pick(cur + 1); e.preventDefault(); }
          else if (e.key === "ArrowUp") { pick(cur - 1); e.preventDefault(); }
          else if (e.key === "Home") { pick(0); e.preventDefault(); }
          else if (e.key === "End") { pick(last); e.preventDefault(); }
        }}
      >
        {nodes.map((n, i) => (
          <li
            key={n.path}
            id={`aht-n${i}`}
            className={styles.item}
            role="treeitem"
            aria-level={n.level}
            aria-selected={i === cur}
            onClick={() => pick(i)}
          >
            <div className={styles.row}>
              <span className={styles.ico} aria-hidden="true"><Icon kind={n.kind} /></span>
              <span className={styles.name}>{n.name}</span>
            </div>
          </li>
        ))}
        <li className={styles.bar} aria-hidden="true" />
      </ul>
    </div>
  );
}
