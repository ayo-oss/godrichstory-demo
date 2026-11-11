import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DragIntoFolderTree.module.scss";

export type FileKind = "image" | "pdf" | "zip";
export type FolderItem = { id: string; name: string };
export type FileItem = { id: string; name: string; kind: FileKind };

export type DragIntoFolderTreeProps = {
  label?: string;
  folders?: FolderItem[];
  files?: FileItem[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type PointerEvt = {
  button: number;
  clientX: number;
  clientY: number;
  pointerId: number;
  currentTarget: { setPointerCapture: (id: number) => void };
  preventDefault: () => void;
};
type PtrMove = { clientX: number; clientY: number };
type KeyDown = { key: string };

function FolderIcon() {
  return (
    <svg viewBox="0 0 256 256" width="14" height="14">
      <g fill="currentColor">
        <path d="M128 80H32V56a8 8 0 0 1 8-8h52.69a8 8 0 0 1 5.65 2.34Z" opacity=".2" />
        <path d="M216 72h-84.69L104 44.69A15.86 15.86 0 0 0 92.69 40H40a16 16 0 0 0-16 16v144.62A15.4 15.4 0 0 0 39.38 216h177.51A15.13 15.13 0 0 0 232 200.89V88a16 16 0 0 0-16-16M92.69 56l16 16H40V56ZM216 200H40V88h176Z" />
      </g>
    </svg>
  );
}

function FileIcon({ kind }: { kind: FileKind }) {
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
  if (kind === "pdf") {
    return (
      <svg viewBox="0 0 256 256" width="13" height="13">
        <g fill="currentColor">
          <path d="M208 88h-56V32Z" opacity=".2" />
          <path d="M52 144H36a8 8 0 0 0-8 8v56a8 8 0 0 0 8 8h16a36 36 0 0 0 0-72m0 56h-8v-40h8a20 20 0 0 1 0 40m169.53-4.91a8 8 0 0 1 .25 11.31A30.06 30.06 0 0 1 200 216c-17.65 0-32-16.15-32-36s14.35-36 32-36a30.06 30.06 0 0 1 21.78 9.6a8 8 0 0 1-11.56 11.06A14.24 14.24 0 0 0 200 160c-8.82 0-16 9-16 20s7.18 20 16 20a14.18 14.18 0 0 0 10.22-4.66a8 8 0 0 1 11.31-.25M128 144c-17.64 0-32 16.15-32 36s14.36 36 32 36s32-16.15 32-36s-14.36-36-32-36m0 56c-8.82 0-16-9-16-20s7.18-20 16-20s16 9 16 20s-7.18 20-16 20m-80-80a8 8 0 0 0 8-8V40h88v48a8 8 0 0 0 8 8h48v16a8 8 0 0 0 16 0V88a8 8 0 0 0-2.34-5.66l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v72a8 8 0 0 0 8 8m112-68.69L188.69 80H160Z" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 256 256" width="13" height="13">
      <g fill="currentColor">
        <path d="M208 88h-56V32Z" opacity=".2" />
        <path d="M184 144h-16a8 8 0 0 0-8 8v56a8 8 0 0 0 16 0v-8h8a28 28 0 0 0 0-56m0 40h-8v-24h8a12 12 0 0 1 0 24m-48-32v56a8 8 0 0 1-16 0v-56a8 8 0 0 1 16 0m-40 56a8 8 0 0 1-8 8H56a8 8 0 0 1-7-12l25.16-44H56a8 8 0 0 1 0-16h32a8 8 0 0 1 7 12l-25.21 44H88a8 8 0 0 1 8 8M213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v72a8 8 0 0 0 16 0V40h88v48a8 8 0 0 0 8 8h48v16a8 8 0 0 0 16 0V88a8 8 0 0 0-2.34-5.66M160 80V51.31L188.69 80Z" />
      </g>
    </svg>
  );
}

const DEFAULT_FOLDERS: FolderItem[] = [
  { id: "uploads", name: "uploads" },
  { id: "archive", name: "archive" },
];
const DEFAULT_FILES: FileItem[] = [
  { id: "photo", name: "photo-01.jpg", kind: "image" },
  { id: "report", name: "report.pdf", kind: "pdf" },
  { id: "data", name: "data.zip", kind: "zip" },
];

export default function DragIntoFolderTree({
  label = "files",
  folders = DEFAULT_FOLDERS,
  files = DEFAULT_FILES,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: DragIntoFolderTreeProps) {
  const [where, setWhere] = useState<{ [k: string]: string | null }>({});
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const [justIn, setJustIn] = useState<string | null>(null);
  const [moving, setMoving] = useState<{ fileId: string; folder: number } | null>(null);
  const [at, setAt] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const kidsOf = (fid: string) => files.filter((f) => where[f.id] === fid);
  const loose = files.filter((f) => !where[f.id]);

  const rows: { key: string; file: FileItem | null }[] = [];
  folders.forEach((fo) => {
    rows.push({ key: fo.id, file: null });
    kidsOf(fo.id).forEach((f) => rows.push({ key: f.id, file: f }));
  });
  loose.forEach((f) => rows.push({ key: f.id, file: f }));
  const cur = Math.max(0, Math.min(at, rows.length - 1));
  const active = rows[cur];

  function drop(fileId: string, folderId: string) {
    setWhere((w) => {
      const next: { [k: string]: string | null } = {};
      for (const k in w) next[k] = w[k];
      next[fileId] = folderId;
      return next;
    });
    setJustIn(fileId);
    window.setTimeout(() => setJustIn(null), 320);
  }

  // 포인터로 끌어 폴더에 놓는다 (마우스·터치). Escape 로 취소.
  useEffect(() => {
    if (!drag) return;
    const id = drag.id;
    function folderAt(x: number, y: number): string | null {
      const el = document.elementFromPoint(x, y);
      const f = el ? el.closest("[data-folder]") : null;
      return f ? f.getAttribute("data-folder") : null;
    }
    function onMove(ev: PtrMove) {
      const x = ev.clientX;
      const y = ev.clientY;
      setDrag((d) => (d ? { id: d.id, x: x, y: y } : d));
      setHot(folderAt(x, y));
    }
    function onUp(ev: PtrMove) {
      const fid = folderAt(ev.clientX, ev.clientY);
      setDrag(null);
      setHot(null);
      if (fid) drop(id, fid);
    }
    function onKey(ev: KeyDown) {
      if (ev.key === "Escape") {
        setDrag(null);
        setHot(null);
      }
    }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.removeEventListener("keydown", onKey);
    };
  }, [drag ? drag.id : null]);

  function grab(e: PointerEvt, fileId: string) {
    if (e.button && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ id: fileId, x: e.clientX, y: e.clientY });
    setMoving(null);
    listRef.current?.focus({ preventScroll: true });
    e.preventDefault();
  }

  function onKeyDown(e: KeyEvt) {
    if (moving) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const step = e.key === "ArrowDown" ? 1 : folders.length - 1;
        const next = (moving.folder + step) % folders.length;
        setMoving({ fileId: moving.fileId, folder: next });
        setHot(folders[next].id);
        e.preventDefault();
      } else if (e.key === "Enter" || e.key === " ") {
        drop(moving.fileId, folders[moving.folder].id);
        setMoving(null);
        setHot(null);
        e.preventDefault();
      } else if (e.key === "Escape") {
        setMoving(null);
        setHot(null);
        e.preventDefault();
      }
      return;
    }
    if (e.key === "ArrowDown") { setAt(Math.min(cur + 1, rows.length - 1)); e.preventDefault(); }
    else if (e.key === "ArrowUp") { setAt(Math.max(cur - 1, 0)); e.preventDefault(); }
    else if (e.key === "Home") { setAt(0); e.preventDefault(); }
    else if (e.key === "End") { setAt(rows.length - 1); e.preventDefault(); }
    else if ((e.key === "Enter" || e.key === " ") && active && active.file) {
      setMoving({ fileId: active.file.id, folder: 0 });
      setHot(folders[0].id);
      e.preventDefault();
    }
  }

  function fileRow(f: FileItem, inside: boolean) {
    const rowCls = [styles.row, inside ? styles.rowIn : "", justIn === f.id ? styles.isIn : ""]
      .filter(Boolean)
      .join(" ");
    return (
      <li
        key={f.id}
        id={`dg-${f.id}`}
        className={styles.item}
        role="treeitem"
        aria-level={inside ? 2 : 1}
        aria-selected={active ? active.key === f.id : false}
        aria-grabbed={drag ? drag.id === f.id : moving ? moving.fileId === f.id : false}
      >
        <div
          className={rowCls}
          onPointerDown={(e: PointerEvt) => grab(e, f.id)}
          onClick={() => setAt(rows.findIndex((r) => r.key === f.id))}
        >
          <span className={styles.ico} aria-hidden="true"><FileIcon kind={f.kind} /></span>
          <span className={styles.name}>{f.name}</span>
        </div>
      </li>
    );
  }

  const ghostFile = drag ? files.filter((f) => f.id === drag.id)[0] : null;

  return (
    <div className={styles.root} style={vars}>
      <ul
        ref={listRef}
        className={styles.list}
        role="tree"
        aria-label={label}
        tabIndex={0}
        aria-activedescendant={active ? `dg-${active.key}` : undefined}
        onKeyDown={onKeyDown}
      >
        {folders.map((fo) => {
          const kids = kidsOf(fo.id);
          return (
            <li
              key={fo.id}
              id={`dg-${fo.id}`}
              className={styles.item}
              role="treeitem"
              aria-level={1}
              aria-expanded={kids.length > 0}
              aria-selected={active ? active.key === fo.id : false}
              data-folder={fo.id}
            >
              <div
                className={`${styles.row} ${styles.rowFolder} ${hot === fo.id ? styles.isHot : ""}`}
                onClick={() => setAt(rows.findIndex((r) => r.key === fo.id))}
              >
                <span className={`${styles.ico} ${styles.icoFolder}`} aria-hidden="true"><FolderIcon /></span>
                <span className={styles.name}>{fo.name}</span>
                <span className={`${styles.count} ${kids.length > 0 ? styles.countOn : ""}`}>{kids.length}</span>
              </div>
              <div className={`${styles.kids} ${kids.length > 0 ? styles.kidsOpen : ""}`}>
                <div className={styles.kwrap}>
                  <ul className={styles.group} role="group" aria-label={fo.name}>
                    {kids.map((f) => fileRow(f, true))}
                  </ul>
                </div>
              </div>
            </li>
          );
        })}
        {loose.map((f) => fileRow(f, false))}
      </ul>
      {drag && ghostFile ? (
        <div
          className={styles.ghost}
          style={{ left: `${drag.x}px`, top: `${drag.y}px` }}
          aria-hidden="true"
        >
          <span className={styles.ico}><FileIcon kind={ghostFile.kind} /></span>
          {ghostFile.name}
        </div>
      ) : null}
    </div>
  );
}
