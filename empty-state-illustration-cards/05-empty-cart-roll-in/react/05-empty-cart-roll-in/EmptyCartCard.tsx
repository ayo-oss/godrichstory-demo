import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./EmptyCartCard.module.scss";

export type EmptyCartCardProps = {
  title?: string;
  fmt?: string;
  action?: string;
  more?: string;
  unitPrice?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function EmptyCartCard({
  title = "Your cart is empty",
  fmt = "{n} items · {won} KRW",
  action = "Keep shopping",
  more = "Add one more",
  unitPrice = 12000,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: EmptyCartCardProps) {
  const [items, setItems] = useState(0);
  const [loop, setLoop] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const sub = fmt.replace("{n}", String(items)).replace("{won}", (items * unitPrice).toLocaleString());
  const cls = [styles.ct, loop ? styles.isDemo : "", items > 0 ? styles.isFilled : ""].join(" ");

  return (
    <section className={cls} style={vars}>
      <div className={styles.track}>
        <span className={styles.cart} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="1em" height="1em">
            <g fill="currentColor">
              <path d="m232 72l-25.63 92.28A16 16 0 0 1 191 176H92.16a16 16 0 0 1-15.41-11.72L51.11 72Z" opacity=".2" />
              <path d="M104 216a16 16 0 1 1-16-16a16 16 0 0 1 16 16m88-16a16 16 0 1 0 16 16a16 16 0 0 0-16-16m47.71-125.86l-25.64 92.28A24.06 24.06 0 0 1 191 184H92.16A24.06 24.06 0 0 1 69 166.42L33.92 40H16a8 8 0 0 1 0-16h24a8 8 0 0 1 7.71 5.86L57.19 64H232a8 8 0 0 1 7.71 10.14M221.47 80H61.64l22.81 82.14a8 8 0 0 0 7.71 5.86H191a8 8 0 0 0 7.71-5.86Z" />
            </g>
          </svg>
        </span>
      </div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.sub} aria-live="polite">{sub}</p>
      <button
        className={styles.btn}
        type="button"
        onClick={() => { setLoop(false); setItems(items + 1); }}
      >
        {items > 0 ? more : action}
      </button>
    </section>
  );
}
