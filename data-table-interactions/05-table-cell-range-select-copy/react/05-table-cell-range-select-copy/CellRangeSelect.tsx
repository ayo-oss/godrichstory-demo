import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CellRangeSelect.module.scss";

export type CellRangeSelectProps = {
  tableLabel?: string;
  /** 머리글 — 열 개수와 데이터 폭을 맞춘다 */
  head?: string[];
  /** 본문 숫자 */
  data?: number[][];
  hint?: string;
  cellWord?: string;
  cellsWord?: string;
  sumWord?: string;
  copiedLabel?: string;
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type PtrEvt = { clientX: number; clientY: number; target: any };
type Cell = { r: number; c: number };
type Rect = { r0: number; r1: number; c0: number; c1: number };

// 셀 한 칸의 크기 — 범위 네모를 scale 로 늘릴 때의 기준
const CELL_W = 66;
const CELL_H = 26;

function CopyIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M216 40v128h-48V88H88V40Z" opacity=".2" />
        <path d="M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z" />
      </g>
    </svg>
  );
}

// 이벤트가 떨어진 자리의 셀 좌표 — data-r · data-c 를 읽는다
function cellOf(node: any): Cell | null {
  const el = node && node.closest ? node.closest("[data-r]") : null;
  if (!el) return null;
  return { r: Number(el.getAttribute("data-r")), c: Number(el.getAttribute("data-c")) };
}

export default function CellRangeSelect({
  tableLabel = "Weekly sales",
  head = ["Mon", "Tue", "Wed", "Thu"],
  data = [
    [12, 18, 9, 24],
    [7, 15, 21, 6],
    [30, 11, 3, 17],
  ],
  hint = "Drag to select",
  cellWord = "cell",
  cellsWord = "cells",
  sumWord = "sum",
  copiedLabel = "Copied",
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#6ec8ff",
}: CellRangeSelectProps) {
  const [anchor, setAnchor] = useState<Cell | null>(null);
  const [sel, setSel] = useState<Rect | null>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [live, setLive] = useState(demo);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.root, live ? styles.isDemo : "", copied ? styles.isCopied : ""].join(" ");

  const inside = (r: number, c: number) =>
    !!sel && r >= sel.r0 && r <= sel.r1 && c >= sel.c0 && c <= sel.c1;

  // 놓는 순간 탭·줄바꿈으로 이어 붙여 클립보드에 넣는다
  useEffect(() => {
    if (!dragging) return;
    const up = () => {
      setDragging(false);
      if (!sel) return;
      const lines: string[] = [];
      for (let r = sel.r0; r <= sel.r1; r++) {
        lines.push(data[r].slice(sel.c0, sel.c1 + 1).map((n) => String(n)).join("\t"));
      }
      if (navigator.clipboard) navigator.clipboard.writeText(lines.join("\n")).catch(() => {});
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [dragging, sel, data]);

  const paint = (from: Cell, to: Cell) => {
    setSel({
      r0: Math.min(from.r, to.r),
      r1: Math.max(from.r, to.r),
      c0: Math.min(from.c, to.c),
      c1: Math.max(from.c, to.c),
    });
  };

  const onDown = (e: PtrEvt) => {
    const cell = cellOf(e.target);
    if (!cell) return;
    setLive(false);
    setAnchor(cell);
    setDragging(true);
    paint(cell, cell);
  };

  const onMove = (e: PtrEvt) => {
    if (!dragging || !anchor) return;
    const cell = cellOf(document.elementFromPoint(e.clientX, e.clientY));
    if (cell) paint(anchor, cell);
  };

  let count = 0;
  let sum = 0;
  data.forEach((row, r) =>
    row.forEach((n, c) => {
      if (inside(r, c)) {
        count += 1;
        sum += n;
      }
    })
  );

  const fmt = (n: number, s: number) => `${n} ${n === 1 ? cellWord : cellsWord} · ${sumWord} ${s}`;

  const boxStyle: CSSProperties = sel
    ? {
        opacity: 1,
        transform: `translate(${sel.c0 * CELL_W}px, ${(sel.r0 + 1) * CELL_H}px) scale(${
          sel.c1 - sel.c0 + 1
        }, ${sel.r1 - sel.r0 + 1})`,
      }
    : {};

  return (
    <div className={cls} style={vars}>
      <div
        className={styles.grid}
        role="grid"
        aria-label={tableLabel}
        onPointerDown={onDown}
        onPointerMove={onMove}
      >
        <div className={[styles.row, styles.rowHead].join(" ")} role="row">
          {head.map((h) => (
            <span key={h} role="columnheader">
              {h}
            </span>
          ))}
        </div>
        {data.map((row, r) => (
          <div className={styles.row} role="row" key={r}>
            {row.map((n, c) => (
              <b
                key={c}
                data-r={r}
                data-c={c}
                role="gridcell"
                className={inside(r, c) ? styles.sel : ""}
              >
                {n}
              </b>
            ))}
          </div>
        ))}
        <div className={styles.box} style={boxStyle} aria-hidden="true" />
      </div>
      <p className={styles.foot} role="status">
        <span className={styles.s0}>{sel ? fmt(count, sum) : hint}</span>
        <span className={styles.s1}>{fmt(1, 12)}</span>
        <span className={styles.s2}>{fmt(4, 52)}</span>
        <span className={styles.s3}>{fmt(9, 126)}</span>
      </p>
      <span className={styles.toast} aria-hidden="true">
        <span className={styles.toastIn}>
          <span className={styles.ic}>
            <CopyIcon />
          </span>
          {copiedLabel}
        </span>
      </span>
    </div>
  );
}
