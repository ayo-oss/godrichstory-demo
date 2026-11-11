import { useState, type CSSProperties } from "react";
import styles from "./NumberedPagination.module.scss";

export type NumberedPaginationProps = {
  total: number;
  initial?: number;
  /** 현재 페이지 강조 색 */
  color?: string;
};

type Vars = CSSProperties & { "--color"?: string };
type Token = number | "...";

function pages(total: number, current: number): Token[] {
  const out: Token[] = [];
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - current) <= 1) out.push(p);
    else if (out[out.length - 1] !== "...") out.push("...");
  }
  return out;
}

export default function NumberedPagination({ total, initial = 1, color = "#2f6df6" }: NumberedPaginationProps) {
  const [current, setCurrent] = useState(initial);
  const vars: Vars = { "--color": color };

  return (
    <nav className={styles.nav} style={vars} aria-label="페이지">
      <button
        className={styles.prev}
        type="button"
        aria-label="이전 페이지"
        disabled={current === 1}
        onClick={() => setCurrent((c) => Math.max(1, c - 1))}
      >‹</button>
      <ul className={styles.list}>
        {pages(total, current).map((p, i) =>
          p === "..." ? (
            <li className={styles.ellipsis} key={`e${i}`} aria-hidden="true">...</li>
          ) : (
            <li key={p}>
              <button
                className={styles.num}
                type="button"
                aria-current={p === current ? "page" : undefined}
                onClick={() => setCurrent(p)}
              >{p}</button>
            </li>
          )
        )}
      </ul>
      <button
        className={styles.next}
        type="button"
        aria-label="다음 페이지"
        disabled={current === total}
        onClick={() => setCurrent((c) => Math.min(total, c + 1))}
      >›</button>
    </nav>
  );
}
