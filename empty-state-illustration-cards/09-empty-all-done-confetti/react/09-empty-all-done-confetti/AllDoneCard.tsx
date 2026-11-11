import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AllDoneCard.module.scss";

export type AllDoneCardProps = {
  title?: string;
  fmt?: string;
  action?: string;
  none?: string;
  maxUndo?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type BitVars = CSSProperties & { "--x"?: string; "--r"?: string; animationDelay?: string };

const BITS: BitVars[] = [
  { "--x": "-46px", "--r": "180deg", animationDelay: "0ms" },
  { "--x": "-26px", "--r": "-150deg", animationDelay: "240ms" },
  { "--x": "-8px", "--r": "210deg", animationDelay: "480ms" },
  { "--x": "10px", "--r": "-190deg", animationDelay: "720ms" },
  { "--x": "28px", "--r": "160deg", animationDelay: "960ms" },
  { "--x": "48px", "--r": "-220deg", animationDelay: "1200ms" },
];

export default function AllDoneCard({
  title = "Everything is done",
  fmt = "{n} tasks left",
  action = "Undo the last one",
  none = "Nothing left to undo",
  maxUndo = 3,
  duration = 2000,
  easing = "ease-in-out",
  color = "#fff7e6",
}: AllDoneCardProps) {
  const [left, setLeft] = useState(0);
  const [loop, setLoop] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const full = left >= maxUndo;
  const cls = [styles.ad, loop ? styles.isDemo : "", left > 0 ? styles.isBack : ""].join(" ");

  return (
    <section className={cls} style={vars}>
      <div className={styles.art}>
        {BITS.map((b, i) => <span className={styles.bit} style={b} key={i} aria-hidden="true" />)}
        <span className={styles.icon} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="1em" height="1em">
            <g fill="currentColor">
              <path d="m58.89 154.89l42.22 42.22l-50.63 18.4a7.79 7.79 0 0 1-10-10Zm138.82-4.72l-91.88-91.88A7.79 7.79 0 0 0 93 61.14l-14.9 41l75.82 75.82l41-14.9a7.79 7.79 0 0 0 2.79-12.89" opacity=".2" />
              <path d="M111.49 52.63a15.8 15.8 0 0 0-26 5.77L33 202.78A15.83 15.83 0 0 0 47.76 224a16 16 0 0 0 5.46-1l144.37-52.5a15.8 15.8 0 0 0 5.78-26Zm-8.33 135.21l-35-35l13.16-36.21l58.05 58.05Zm-55 20l14-38.41l24.45 24.45ZM156 168.64L87.36 100l13-35.87l91.43 91.43ZM160 72a37.8 37.8 0 0 1 3.84-15.58C169.14 45.83 179.14 40 192 40c6.7 0 11-2.29 13.65-7.21a22 22 0 0 0 2.35-8.85a8 8 0 0 1 16 .06c0 12.86-8.52 32-32 32c-6.7 0-11 2.29-13.65 7.21a22 22 0 0 0-2.35 8.85a8 8 0 0 1-16-.06m-24-32V16a8 8 0 0 1 16 0v24a8 8 0 0 1-16 0m101.66 82.34a8 8 0 1 1-11.32 11.31l-16-16a8 8 0 0 1 11.32-11.32Zm4.87-42.75l-24 8a8 8 0 0 1-5.06-15.18l24-8a8 8 0 0 1 5.06 15.18" />
            </g>
          </svg>
        </span>
      </div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.sub} aria-live="polite">{fmt.replace("{n}", String(left))}</p>
      <button
        className={styles.btn}
        type="button"
        disabled={full}
        onClick={() => { setLoop(false); setLeft(left + 1); }}
      >
        {full ? none : action}
      </button>
    </section>
  );
}
