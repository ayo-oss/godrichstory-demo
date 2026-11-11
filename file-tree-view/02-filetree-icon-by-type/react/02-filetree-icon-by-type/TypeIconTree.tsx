import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TypeIconTree.module.scss";

export type TypeNode = { name: string; kind?: string; kids?: TypeNode[] };

export type TypeIconTreeProps = {
  treeLabel?: string;
  nodes?: TypeNode[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type ClickEvt = { stopPropagation: () => void };

const DEFAULT_NODES: TypeNode[] = [
  {
    name: "portfolio",
    kind: "폴더",
    kids: [
      { name: "resume.pdf", kind: "PDF" },
      { name: "site", kind: "폴더", kids: [{ name: "cover.jpg", kind: "JPG" }] },
    ],
  },
  { name: "main.js", kind: "JS" },
  { name: "style.css", kind: "CSS" },
  { name: "bundle.zip", kind: "ZIP" },
];

// 아이콘은 vanilla 데모(02-filetree-icon-by-type/index.html)의 인라인 SVG 그대로다.
function IcoFolder() {
  return (
    <svg viewBox="0 0 256 256" width="14" height="14">
      <g fill="currentColor">
        <path d="M128 80H32V56a8 8 0 0 1 8-8h52.69a8 8 0 0 1 5.65 2.34Z" opacity=".2" />
        <path d="M216 72h-84.69L104 44.69A15.86 15.86 0 0 0 92.69 40H40a16 16 0 0 0-16 16v144.62A15.4 15.4 0 0 0 39.38 216h177.51A15.13 15.13 0 0 0 232 200.89V88a16 16 0 0 0-16-16M92.69 56l16 16H40V56ZM216 200H40V88h176Z" />
      </g>
    </svg>
  );
}
function IcoPdf() {
  return (
    <svg viewBox="0 0 256 256" width="13" height="13">
      <g fill="currentColor">
        <path d="M208 88h-56V32Z" opacity=".2" />
        <path d="M52 144H36a8 8 0 0 0-8 8v56a8 8 0 0 0 8 8h16a36 36 0 0 0 0-72m0 56h-8v-40h8a20 20 0 0 1 0 40m169.53-4.91a8 8 0 0 1 .25 11.31A30.06 30.06 0 0 1 200 216c-17.65 0-32-16.15-32-36s14.35-36 32-36a30.06 30.06 0 0 1 21.78 9.6a8 8 0 0 1-11.56 11.06A14.24 14.24 0 0 0 200 160c-8.82 0-16 9-16 20s7.18 20 16 20a14.18 14.18 0 0 0 10.22-4.66a8 8 0 0 1 11.31-.25M128 144c-17.64 0-32 16.15-32 36s14.36 36 32 36s32-16.15 32-36s-14.36-36-32-36m0 56c-8.82 0-16-9-16-20s7.18-20 16-20s16 9 16 20s-7.18 20-16 20m-80-80a8 8 0 0 0 8-8V40h88v48a8 8 0 0 0 8 8h48v16a8 8 0 0 0 16 0V88a8 8 0 0 0-2.34-5.66l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v72a8 8 0 0 0 8 8m112-68.69L188.69 80H160Z" />
      </g>
    </svg>
  );
}
function IcoImg() {
  return (
    <svg viewBox="0 0 256 256" width="13" height="13">
      <g fill="currentColor">
        <path d="m104 152l48 72H24l36-56l16.36 25.45Zm48-120v56h56Z" opacity=".2" />
        <path d="M110.66 147.56a8 8 0 0 0-13.32 0l-20.85 31.29l-9.76-15.18a8 8 0 0 0-13.46 0l-36 56A8 8 0 0 0 24 232h128a8 8 0 0 0 6.66-12.44ZM38.65 216L60 182.79l9.63 15a8 8 0 0 0 13.39.11l21-31.47L137.05 216Zm175-133.66l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v88a8 8 0 0 0 16 0V40h88v48a8 8 0 0 0 8 8h48v120h-8a8 8 0 0 0 0 16h8a16 16 0 0 0 16-16V88a8 8 0 0 0-2.34-5.66ZM160 51.31L188.69 80H160Z" />
      </g>
    </svg>
  );
}
function IcoJs() {
  return (
    <svg viewBox="0 0 256 256" width="13" height="13">
      <g fill="currentColor">
        <path d="M208 88h-56V32Z" opacity=".2" />
        <path d="m213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v72a8 8 0 0 0 16 0V40h88v48a8 8 0 0 0 8 8h48v120h-24a8 8 0 0 0 0 16h24a16 16 0 0 0 16-16V88a8 8 0 0 0-2.34-5.66M160 51.31L188.69 80H160Zm-12.19 145a20.82 20.82 0 0 1-9.19 15.23C133.43 215 127 216 121.13 216a61 61 0 0 1-15.13-2a8 8 0 1 1 4.3-15.41c4.38 1.2 15 2.7 19.55-.36c.88-.59 1.83-1.52 2.14-3.93c.35-2.67-.71-4.1-12.78-7.59c-9.35-2.7-25-7.23-23-23.11a20.56 20.56 0 0 1 9-14.95c11.84-8 30.71-3.31 32.83-2.76a8 8 0 0 1-4.07 15.48c-4.49-1.17-15.23-2.56-19.83.56a4.54 4.54 0 0 0-2 3.67c-.12.9-.14 1.09 1.11 1.9c2.31 1.49 6.45 2.68 10.45 3.84c9.79 2.83 26.35 7.66 24.11 24.97M80 152v38a26 26 0 0 1-52 0a8 8 0 0 1 16 0a10 10 0 0 0 20 0v-38a8 8 0 0 1 16 0" />
      </g>
    </svg>
  );
}
function IcoCss() {
  return (
    <svg viewBox="0 0 256 256" width="13" height="13">
      <g fill="currentColor">
        <path d="M208 88h-56V32Z" opacity=".2" />
        <path d="M48 180c0 11 7.18 20 16 20a14.2 14.2 0 0 0 10.22-4.66a8 8 0 1 1 11.55 11.06A30 30 0 0 1 64 216c-17.65 0-32-16.15-32-36s14.35-36 32-36a30 30 0 0 1 21.77 9.6a8 8 0 1 1-11.55 11.06A14.24 14.24 0 0 0 64 160c-8.82 0-16 9-16 20m79.6-8.69c-4-1.16-8.14-2.35-10.45-3.84c-1.26-.81-1.23-1-1.12-1.9a4.54 4.54 0 0 1 2-3.67c4.6-3.12 15.35-1.73 19.83-.56a8 8 0 0 0 4.07-15.48c-2.12-.55-21-5.22-32.83 2.76a20.55 20.55 0 0 0-9 14.95c-2 15.88 13.64 20.41 23 23.11c12.07 3.49 13.13 4.92 12.78 7.59c-.31 2.41-1.26 3.34-2.14 3.93c-4.6 3.06-15.17 1.56-19.55.36a8 8 0 0 0-4.3 15.41a61.2 61.2 0 0 0 15.18 2c5.83 0 12.3-1 17.49-4.46a20.82 20.82 0 0 0 9.19-15.23c2.25-17.28-14.27-22.11-24.15-24.97m64 0c-4-1.16-8.14-2.35-10.45-3.84c-1.25-.81-1.23-1-1.12-1.9a4.54 4.54 0 0 1 2-3.67c4.6-3.12 15.34-1.73 19.82-.56a8 8 0 0 0 4.07-15.48c-2.11-.55-21-5.22-32.83 2.76a20.58 20.58 0 0 0-8.95 14.95c-2 15.88 13.65 20.41 23 23.11c12.06 3.49 13.12 4.92 12.78 7.59c-.31 2.41-1.26 3.34-2.15 3.93c-4.6 3.06-15.16 1.56-19.54.36a8 8 0 0 0-4.3 15.44a61.3 61.3 0 0 0 15.19 2c5.82 0 12.3-1 17.49-4.46a20.81 20.81 0 0 0 9.18-15.23c2.21-17.31-14.31-22.14-24.2-25ZM40 112V40a16 16 0 0 1 16-16h96a8 8 0 0 1 5.66 2.34l56 56A8 8 0 0 1 216 88v24a8 8 0 1 1-16 0V96h-48a8 8 0 0 1-8-8V40H56v72a8 8 0 0 1-16 0m120-32h28.68L160 51.31Z" />
      </g>
    </svg>
  );
}
function IcoZip() {
  return (
    <svg viewBox="0 0 256 256" width="13" height="13">
      <g fill="currentColor">
        <path d="M208 88h-56V32Z" opacity=".2" />
        <path d="M184 144h-16a8 8 0 0 0-8 8v56a8 8 0 0 0 16 0v-8h8a28 28 0 0 0 0-56m0 40h-8v-24h8a12 12 0 0 1 0 24m-48-32v56a8 8 0 0 1-16 0v-56a8 8 0 0 1 16 0m-40 56a8 8 0 0 1-8 8H56a8 8 0 0 1-7-12l25.16-44H56a8 8 0 0 1 0-16h32a8 8 0 0 1 7 12l-25.21 44H88a8 8 0 0 1 8 8M213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v72a8 8 0 0 0 16 0V40h88v48a8 8 0 0 0 8 8h48v16a8 8 0 0 0 16 0V88a8 8 0 0 0-2.34-5.66M160 80V51.31L188.69 80Z" />
      </g>
    </svg>
  );
}

function extOf(name: string) {
  return name.slice(name.lastIndexOf(".") + 1).toLowerCase();
}
function iconFor(name: string) {
  const ext = extOf(name);
  if (ext === "pdf") return <IcoPdf />;
  if (ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp" || ext === "gif") return <IcoImg />;
  if (ext === "css" || ext === "scss") return <IcoCss />;
  if (ext === "zip" || ext === "tar" || ext === "gz") return <IcoZip />;
  return <IcoJs />;
}

type Flat = { id: string; folder: boolean };

export default function TypeIconTree({
  treeLabel = "files",
  nodes = DEFAULT_NODES,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: TypeIconTreeProps) {
  // 기본은 펼침 — 닫은 줄만 shut 에 기록한다 (vanilla 의 aria-expanded="true" 시작과 같다)
  const [shut, setShut] = useState<Record<string, boolean>>({});
  const [at, setAt] = useState(0);
  const treeRef = useRef<HTMLUListElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const opened = (id: string) => shut[id] !== true;

  const flat: Flat[] = [];
  function walk(list: TypeNode[], path: string) {
    list.forEach((n, i) => {
      const id = `${path}-${i}`;
      const kids = n.kids;
      flat.push({ id, folder: !!kids });
      if (kids && opened(id)) walk(kids, id);
    });
  }
  walk(nodes, "tit");
  const cur = at < flat.length ? at : flat.length - 1;
  const active = flat[cur];

  function pick(id: string, folder: boolean) {
    const k = flat.findIndex((f) => f.id === id);
    if (k >= 0) setAt(k);
    if (folder) setShut((s) => ({ ...s, [id]: opened(id) }));
    if (treeRef.current) treeRef.current.focus({ preventScroll: true });
  }

  function onKeyDown(e: KeyEvt) {
    if (e.key === "ArrowDown") { setAt(Math.min(cur + 1, flat.length - 1)); e.preventDefault(); }
    else if (e.key === "ArrowUp") { setAt(Math.max(cur - 1, 0)); e.preventDefault(); }
    else if (e.key === "Home") { setAt(0); e.preventDefault(); }
    else if (e.key === "End") { setAt(flat.length - 1); e.preventDefault(); }
  }

  // 반환형을 적어둔다 — 재귀 함수라 tsc 가 추론을 순환으로 본다(TS7023)
  function branch(list: TypeNode[], path: string, level: number): any[] {
    return list.map((n, i) => {
      const id = `${path}-${i}`;
      const kids = n.kids;
      const on = opened(id);
      const kind = n.kind || extOf(n.name).toUpperCase();
      const cls = [
        styles.item,
        kids ? styles.isBranch : styles.isLeaf,
        kids && !on ? styles.isShut : "",
        active && active.id === id ? styles.isAt : "",
      ].join(" ");
      return (
        <li key={id} id={id} className={cls} role="treeitem" aria-level={level} aria-expanded={kids ? on : undefined}>
          <div className={styles.row} onClick={(e: ClickEvt) => { e.stopPropagation(); pick(id, !!kids); }}>
            <span className={kids ? `${styles.ico} ${styles.icoFolder}` : styles.ico} aria-hidden="true">
              {kids ? <IcoFolder /> : iconFor(n.name)}
            </span>
            <span className={styles.name}>{n.name}</span>
            <span className={styles.kind} aria-hidden={kids ? true : undefined}>{kind}</span>
          </div>
          {kids ? (
            <div className={styles.kids}>
              <div className={styles.kwrap}>
                <ul className={level === 1 ? styles.lv2 : styles.lv3} role="group" aria-label={n.name}>
                  {branch(kids, id, level + 1)}
                </ul>
              </div>
            </div>
          ) : null}
        </li>
      );
    });
  }

  return (
    <div className={styles.ft} style={vars}>
      <ul
        ref={treeRef}
        className={styles.tree}
        role="tree"
        aria-label={treeLabel}
        tabIndex={0}
        aria-activedescendant={active ? active.id : undefined}
        onKeyDown={onKeyDown}
      >
        {branch(nodes, "tit", 1)}
      </ul>
    </div>
  );
}
