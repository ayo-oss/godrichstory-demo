import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ColumnVisibilityMenu.module.scss";

export type ColumnVisibilityMenuProps = {
  buttonLabel?: string;
  menuLabel?: string;
  tableLabel?: string;
  /** 열 이름 — 목록의 체크 항목이자 표의 머리글 */
  columns?: string[];
  /** 본문 행 — 열 개수와 길이를 맞춘다 */
  rows?: string[][];
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--t"?: string;
};

function EyeIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M128 56c-80 0-112 72-112 72s32 72 112 72s112-72 112-72s-32-72-112-72m0 112a40 40 0 1 1 40-40a40 40 0 0 1-40 40" opacity=".2" />
        <path d="M247.31 124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57 61.26 162.88 48 128 48S61.43 61.26 36.34 86.35C17.51 105.18 9 124 8.69 124.76a8 8 0 0 0 0 6.5c.35.79 8.82 19.57 27.65 38.4C61.43 194.74 93.12 208 128 208s66.57-13.26 91.66-38.34c18.83-18.83 27.3-37.61 27.65-38.4a8 8 0 0 0 0-6.5M128 192c-30.78 0-57.67-11.19-79.93-33.25A133.5 133.5 0 0 1 25 128a133.3 133.3 0 0 1 23.07-30.75C70.33 75.19 97.22 64 128 64s57.67 11.19 79.93 33.25A133.5 133.5 0 0 1 231.05 128c-7.21 13.46-38.62 64-103.05 64m0-112a48 48 0 1 0 48 48a48.05 48.05 0 0 0-48-48m0 80a32 32 0 1 1 32-32a32 32 0 0 1-32 32" />
      </g>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2" />
        <path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32" />
      </g>
    </svg>
  );
}

export default function ColumnVisibilityMenu({
  buttonLabel = "Columns",
  menuLabel = "Choose columns",
  tableLabel = "Order table",
  columns = ["Order", "Qty", "Points"],
  rows = [
    ["A-1043", "3", "820"],
    ["A-1044", "1", "410"],
  ],
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ColumnVisibilityMenuProps) {
  const [on, setOn] = useState<boolean[]>(columns.map(() => true));
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(demo);

  const shown = on.filter(Boolean).length;
  // 켜진 열만 1fr, 끈 열은 0fr 로 접는다
  const track = on.map((v) => (v ? "1fr" : "0fr")).join(" ");
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--t": track,
  };
  const cls = [styles.root, live ? styles.isDemo : "", open ? styles.isOpen : ""].join(" ");

  const toggle = (i: number) => {
    setLive(false);
    if (on[i] && shown < 2) return; // 마지막 한 열은 끄지 않는다
    setOn(on.map((v, k) => (k === i ? !v : v)));
  };

  return (
    <div className={cls} style={vars}>
      <div className={styles.bar}>
        <button
          className={styles.btn}
          type="button"
          aria-expanded={open}
          aria-controls="cv-menu"
          onClick={() => {
            setLive(false);
            setOpen(!open);
          }}
        >
          <span className={styles.ic} aria-hidden="true">
            <EyeIcon />
          </span>
          <span className={styles.btnT}>{buttonLabel}</span>
          <span className={styles.num}>
            <b className={styles.n3}>{shown}</b>
            <b className={styles.n2}>2</b>
          </span>
        </button>
      </div>

      <div className={styles.menu} id="cv-menu" role="group" aria-label={menuLabel}>
        <div className={styles.menuIn}>
          {columns.map((name, i) => (
            <button
              key={name}
              className={styles.opt}
              type="button"
              role="checkbox"
              aria-checked={on[i]}
              onClick={() => toggle(i)}
            >
              <span className={styles.box} aria-hidden="true">
                <CheckIcon />
              </span>
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.grid} role="grid" aria-label={tableLabel}>
        <div className={styles.row} role="row">
          {columns.map((name, i) => (
            <span
              key={name}
              className={[styles.h, on[i] ? "" : styles.off].join(" ")}
              role="columnheader"
            >
              {name}
            </span>
          ))}
        </div>
        {rows.map((row, ri) => (
          <div className={styles.row} role="row" key={ri}>
            {row.map((cell, i) => (
              <span key={i} className={on[i] ? "" : styles.off} role="gridcell">
                {cell}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
