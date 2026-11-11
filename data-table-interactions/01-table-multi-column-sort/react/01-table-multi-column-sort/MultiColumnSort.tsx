import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MultiColumnSort.module.scss";

export type SortRow = { id: string; team: string; score: number; date: string };

export type MultiColumnSortProps = {
  rows?: SortRow[];
  tableLabel?: string;
  teamLabel?: string;
  scoreLabel?: string;
  dateLabel?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type ClickEvt = { shiftKey: boolean };
type ColKey = "score" | "date";
type SortKey = { k: ColKey; dir: number };

const DEFAULT_ROWS: SortRow[] = [
  { id: "a", team: "Amber", score: 92, date: "03-14" },
  { id: "b", team: "Blue", score: 92, date: "02-02" },
  { id: "c", team: "Mint", score: 88, date: "05-21" },
  { id: "d", team: "Pink", score: 88, date: "01-09" },
];

function Caret() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M208 160H48l80-80Z" opacity=".2" />
        <path d="m213.66 154.34l-80-80a8 8 0 0 0-11.32 0l-80 80A8 8 0 0 0 48 168h160a8 8 0 0 0 5.66-13.66M67.31 152L128 91.31L188.69 152Z" />
      </g>
    </svg>
  );
}

// 한 열만 비교한다 — 점수는 수, 날짜는 글자. 유니온을 그대로 < 로 재면 tsc 가 막는다
function cmp(a: SortRow, b: SortRow, k: ColKey): number {
  if (k === "score") return a.score < b.score ? -1 : a.score > b.score ? 1 : 0;
  return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
}

function sortRows(list: SortRow[], ks: SortKey[]): SortRow[] {
  return list.slice().sort((a, b) => {
    for (let i = 0; i < ks.length; i++) {
      const c = cmp(a, b, ks[i].k);
      if (c) return c * ks[i].dir;
    }
    return 0;
  });
}

export default function MultiColumnSort({
  rows = DEFAULT_ROWS,
  tableLabel = "Team ranking",
  teamLabel = "Team",
  scoreLabel = "Score",
  dateLabel = "Date",
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: MultiColumnSortProps) {
  const [list, setList] = useState<SortRow[]>(rows);
  const [keys, setKeys] = useState<SortKey[]>([{ k: "score", dir: -1 }]);
  const [live, setLive] = useState(demo);

  const bodyRef = useRef<HTMLDivElement>(null);
  // ambient useRef 는 항상 T | null 을 돌려준다 — 지역 별칭으로 한 번만 좁혀 쓴다
  const wasRef = useRef<{ [id: string]: number }>({});

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // FLIP — 새 자리에 그린 뒤 옛 자리로 되돌려 놓고 0 으로 달린다
  useEffect(() => {
    const body = bodyRef.current;
    const was = wasRef.current;
    if (!body || !was) return;
    const kids: HTMLElement[] = Array.prototype.slice.call(body.children);
    kids.forEach((el) => {
      const id = el.getAttribute("data-id") || "";
      const from = was[id];
      if (from === undefined) return;
      const d = from - el.getBoundingClientRect().top;
      if (!d) return;
      el.style.transition = "none";
      el.style.transform = `translateY(${d}px)`;
      requestAnimationFrame(() => {
        el.style.transition = `transform 320ms ${easing}`;
        el.style.transform = "translateY(0)";
      });
    });
    wasRef.current = {};
  }, [list]);

  function onSort(key: ColKey, add: boolean) {
    setLive(false);
    const body = bodyRef.current;
    const was: { [id: string]: number } = {};
    if (body) {
      const kids: HTMLElement[] = Array.prototype.slice.call(body.children);
      kids.forEach((el) => { was[el.getAttribute("data-id") || ""] = el.getBoundingClientRect().top; });
    }
    wasRef.current = was;

    let next: SortKey[];
    const has = keys.filter((k) => k.k === key).length > 0;
    if (has) next = keys.map((k) => (k.k === key ? { k: k.k, dir: -k.dir } : k));
    else next = add ? keys.concat([{ k: key, dir: 1 }]).slice(-2) : [{ k: key, dir: -1 }];
    setKeys(next);
    setList(sortRows(list, next));
  }

  const heads: { key: ColKey; label: string; ord: string }[] = [
    { key: "score", label: scoreLabel, ord: "1" },
    { key: "date", label: dateLabel, ord: "2" },
  ];

  return (
    <div className={`${styles.root} ${live ? styles.isDemo : ""}`} style={vars} role="grid" aria-label={tableLabel}>
      <div className={styles.head} role="row">
        <span className={`${styles.h} ${styles.hText}`}>{teamLabel}</span>
        {heads.map((h) => {
          let at = -1;
          keys.forEach((k, n) => { if (k.k === h.key) at = n; });
          const on = at >= 0;
          return (
            <button
              key={h.key}
              className={`${styles.h} ${h.key === "date" ? styles.hDate : ""} ${on ? styles.isOn : ""}`}
              type="button"
              aria-sort={!on ? "none" : keys[at].dir < 0 ? "descending" : "ascending"}
              onClick={(e: ClickEvt) => onSort(h.key, e.shiftKey)}
            >
              <span className={styles.label}>{h.label}</span>
              <span className={styles.ord} aria-hidden="true" hidden={!on || keys.length < 2}>
                {on ? String(at + 1) : h.ord}
              </span>
              <span className={styles.caret} aria-hidden="true"><Caret /></span>
            </button>
          );
        })}
      </div>
      <div className={styles.body} role="rowgroup" ref={bodyRef}>
        {list.map((r) => (
          <div className={styles.row} role="row" data-id={r.id} key={r.id}>
            <span role="gridcell">{r.team}</span>
            <b role="gridcell">{r.score}</b>
            <span role="gridcell">{r.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
