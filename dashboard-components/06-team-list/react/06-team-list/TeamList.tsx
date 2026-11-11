import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TeamList.module.scss";

export type TeamListProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const MEMBERS = [
  { name: "Kim Doyoon", initial: "K", status: "on" as const },
  { name: "Lee Seojun", initial: "L", status: "away" as const },
  { name: "Park Haeun", initial: "P", status: "on" as const },
];

export default function TeamList({ duration = 600, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#6ec8ff" }: TeamListProps) {
  const [query, setQuery] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const filtered = useMemo(
    () => MEMBERS.filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase())),
    [query]
  );

  return (
    <div className={styles.tl} style={vars}>
      <div className={styles.head}>
        <input
          className={styles.search}
          type="text"
          placeholder="Search by name"
          aria-label="Member search"
          value={query}
          onChange={(e: any) => setQuery(e.target.value)}
        />
        <button type="button" className={styles.invite} aria-label="Invite">+</button>
      </div>
      <ul className={styles.list}>
        {filtered.map((m) => (
          <li key={m.name} className={styles.row}>
            <span className={styles.avatar}>
              {m.initial}
              <span className={`${styles.status} ${styles[m.status]}`} />
            </span>
            <span className={styles.name}>{m.name}</span>
          </li>
        ))}
      </ul>
      {filtered.length === 0 && <p className={styles.empty}>No matching members</p>}
    </div>
  );
}
