import { CSSProperties, useState } from "react";
import styles from "./ListAddRemove.module.scss";

interface Task {
  id: number;
  label: string;
  leaving?: boolean;
}

let nextId = 3;

export interface ListAddRemoveProps {
  duration?: string;
  easing?: string;
}

export default function ListAddRemove({
  duration = "300ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
}: ListAddRemoveProps) {
  const [items, setItems] = useState<Task[]>([
    { id: 1, label: "Wash the car" },
    { id: 2, label: "Reply to client email" },
  ]);

  const add = () => {
    const id = nextId++;
    setItems((list) => [...list, { id, label: "Book flight tickets" }]);
  };

  const startRemove = (id: number) => {
    // Mark it leaving first (drives the CSS exit transition, styles.leaving below).
    // The item keeps rendering — with opacity heading to 0 — until its own
    // onTransitionEnd fires, which is when it actually leaves the array.
    setItems((list) => list.map((it) => (it.id === id ? { ...it, leaving: true } : it)));
  };

  const finishRemove = (id: number) => {
    setItems((list) => list.filter((it) => it.id !== id));
  };

  const style: CSSProperties & { "--duration"?: string; "--easing"?: string } = {
    "--duration": duration,
    "--easing": easing,
  };

  return (
    <div className={styles.wrap} style={style}>
      <ul className={styles.list}>
        {items.map((it) => (
          <li
            key={it.id}
            className={`${styles.item} ${it.leaving ? styles.leaving : styles.entering}`}
            onTransitionEnd={() => it.leaving && finishRemove(it.id)}
          >
            {it.label}
            <button className={styles.remove} onClick={() => startRemove(it.id)}>×</button>
          </li>
        ))}
      </ul>
      <button className={styles.add} onClick={add}>+ Add task</button>
    </div>
  );
}
