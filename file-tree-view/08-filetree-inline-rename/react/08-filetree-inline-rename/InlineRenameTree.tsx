import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./InlineRenameTree.module.scss";

export type RenameNode = { id: string; name: string; kind?: "file" | "folder" };

export type InlineRenameTreeProps = {
  title?: string;
  addLabel?: string;
  newName?: string;
  nodes?: RenameNode[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type ChangeEvt = { target: { value: string } };

const DEFAULT_NODES: RenameNode[] = [
  { id: "rn-1", name: "src", kind: "folder" },
  { id: "rn-2", name: "notes.md" },
  { id: "rn-3", name: "app.js" },
  { id: "rn-4", name: "bundle.zip" },
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
        <path d="m213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v72a8 8 0 0 0 16 0V40h88v48a8 8 0 0 0 8 8h48v128a8 8 0 0 0 16 0V88a8 8 0 0 0-2.34-5.66M160 51.31L188.69 80H160ZM144 144h-16a8 8 0 0 0-8 8v56a8 8 0 0 0 8 8h16a36 36 0 0 0 0-72m0 56h-8v-40h8a20 20 0 0 1 0 40m-40-48v56a8 8 0 0 1-16 0v-30.62l-13.45 19.21a8 8 0 0 1-13.1 0L48 177.38V208a8 8 0 0 1-16 0v-56a8 8 0 0 1 14.55-4.59L68 178.05l21.45-30.64A8 8 0 0 1 104 152" />
      </g>
    </svg>
  );
}

function plusIcon() {
  return (
    <svg viewBox="0 0 256 256" width="11" height="11" aria-hidden="true">
      <g fill="currentColor">
        <path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" />
        <path d="M224 128a8 8 0 0 1-8 8h-80v80a8 8 0 0 1-16 0v-80H40a8 8 0 0 1 0-16h80V40a8 8 0 0 1 16 0v80h80a8 8 0 0 1 8 8" />
      </g>
    </svg>
  );
}

function okIcon() {
  return (
    <svg viewBox="0 0 256 256" width="12" height="12" aria-hidden="true">
      <g fill="currentColor">
        <path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2" />
        <path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32" />
      </g>
    </svg>
  );
}

export default function InlineRenameTree({
  title = "프로젝트 파일",
  addLabel = "파일 추가",
  newName = "new-file.md",
  nodes = DEFAULT_NODES,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: InlineRenameTreeProps) {
  const [list, setList] = useState<RenameNode[]>(nodes);
  const [at, setAt] = useState(nodes.length > 1 ? nodes[1].id : nodes[0].id);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const treeRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef<number>(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 입력칸이 뜨면 그 자리로 포커스 + 기존 이름 전체선택
  useEffect(() => {
    if (!editing) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    input.select();
  }, [editing]);

  // 저장 뒤 체크 표시 한 번 (vanilla 의 is-flash 480ms 와 같은 길이)
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 480);
    return () => window.clearTimeout(t);
  }, [flash]);

  function edit(id: string, name: string) {
    setAt(id);
    setDraft(name);
    setEditing(id);
  }

  function done(save: boolean) {
    const id = editing;
    if (!id) return;
    const v = draft.trim();
    if (save && v) {
      setList((ns) => ns.map((n) => (n.id === id ? { id: n.id, name: v, kind: n.kind } : n)));
      setFlash(id);
    }
    setEditing(null);
    treeRef.current?.focus({ preventScroll: true });
  }

  function onInputKeyDown(e: KeyEvt) {
    if (e.key === "Enter") { done(true); e.preventDefault(); }
    else if (e.key === "Escape") { done(false); e.preventDefault(); }
  }

  function onTreeKeyDown(e: KeyEvt) {
    if (editing) return;
    if (e.key === "F2" || e.key === "Enter") {
      const n = list.filter((x) => x.id === at)[0];
      if (n) edit(n.id, n.name);
      e.preventDefault();
    }
  }

  function add() {
    const k = (seq.current || 0) + 1;
    seq.current = k;
    const id = `rn-new-${k}`;
    setList((ns) => ns.concat([{ id, name: newName }]));
    edit(id, newName);
  }

  return (
    <div className={styles.rn} style={vars}>
      <div className={styles.head}>
        <span className={styles.title} id="rn-title">{title}</span>
        <button className={styles.add} type="button" aria-label={addLabel} onClick={add}>
          {plusIcon()}
          <span>{addLabel}</span>
        </button>
      </div>
      <ul
        ref={treeRef}
        className={styles.tree}
        role="tree"
        aria-labelledby="rn-title"
        tabIndex={0}
        aria-activedescendant={at}
        onKeyDown={onTreeKeyDown}
      >
        {list.map((n) => (
          <li key={n.id} id={n.id} className={styles.item} role="treeitem" aria-level={1} aria-label={n.name}>
            <div
              className={`${styles.row} ${at === n.id ? styles.isAt : ""}`}
              onClick={() => setAt(n.id)}
              onDoubleClick={() => edit(n.id, n.name)}
            >
              <span className={`${styles.ico} ${n.kind === "folder" ? styles.icoFolder : ""}`}>
                {n.kind === "folder" ? folderIcon() : fileIcon()}
              </span>
              {editing === n.id ? (
                <span className={styles.live}>
                  <input
                    ref={inputRef}
                    className={styles.edit}
                    type="text"
                    aria-label="파일 이름"
                    value={draft}
                    onChange={(e: ChangeEvt) => setDraft(e.target.value)}
                    onKeyDown={onInputKeyDown}
                  />
                </span>
              ) : (
                <span className={styles.name}>{n.name}</span>
              )}
              <span className={`${styles.ok} ${flash === n.id ? styles.isFlash : ""}`} aria-hidden="true">
                {okIcon()}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
