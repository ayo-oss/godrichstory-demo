import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./KanbanBoard.module.scss";

export type KanbanBoardProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

type Card = { id: string; label: string; dot: "warn" | "info" | "none" };
const INITIAL: Card[][] = [
  [{ id: "c1", label: "Write landing copy", dot: "warn" }],
  [{ id: "c2", label: "Organize icon set", dot: "info" }],
  [{ id: "c3", label: "Clean up copy.json", dot: "none" }],
];
const NAMES = ["To do", "In progress", "Done"];

export default function KanbanBoard({ duration = 220, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#fff7e6" }: KanbanBoardProps) {
  const [cols, setCols] = useState<Card[][]>(INITIAL);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function move(colIndex: number, cardId: string) {
    if (colIndex >= cols.length - 1) return;
    setCols((prev) => {
      const next = prev.map((c) => c.slice());
      const idx = next[colIndex].findIndex((c) => c.id === cardId);
      const [card] = next[colIndex].splice(idx, 1);
      next[colIndex + 1].push(card);
      return next;
    });
  }

  return (
    <div className={styles.kb} style={vars}>
      {cols.map((col, i) => (
        <div key={NAMES[i]} className={styles.col}>
          <p className={styles.head}>{NAMES[i]} <span className={styles.count}>{col.length}</span></p>
          <div className={styles.cards}>
            {col.map((card) => (
              <div key={card.id} className={styles.card}>
                {i === cols.length - 1 ? (
                  <span className={styles.ic}>✓</span>
                ) : (
                  <span className={`${styles.dot} ${styles[card.dot]}`} />
                )}
                <span className={styles.label}>{card.label}</span>
                {i < cols.length - 1 && (
                  <button type="button" className={styles.move} aria-label="Move to next column" onClick={() => move(i, card.id)}>→</button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
