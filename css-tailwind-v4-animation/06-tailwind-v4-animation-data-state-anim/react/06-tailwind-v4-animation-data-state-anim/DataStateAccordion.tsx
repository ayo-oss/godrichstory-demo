import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DataStateAccordion.module.scss";

export type DataStateAccordionProps = {
  trigger?: string;
  children?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function DataStateAccordion({
  trigger = "Shipping info",
  children = "Ships within 1-2 days of payment; remote areas take one extra day.",
  duration = 220,
  easing = "ease-out",
  color = "#17141a",
}: DataStateAccordionProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.acc} style={vars}>
      <button
        type="button"
        className={styles.acc__trigger}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </button>
      <div className={styles.acc__panel} data-state={open ? "open" : "closed"}>
        <p>{children}</p>
      </div>
    </div>
  );
}
