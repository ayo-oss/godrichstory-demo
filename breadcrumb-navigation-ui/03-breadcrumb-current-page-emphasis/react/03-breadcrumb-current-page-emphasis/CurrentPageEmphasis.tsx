import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CurrentPageEmphasis.module.scss";

export type CurrentPageEmphasisProps = {
  trail?: string[];
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type ClickEvt = { preventDefault(): void };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const IconCheck = () => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true"><g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2"/><path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88"/></g></svg>
);

export default function CurrentPageEmphasis({
  trail = ["Home", "Electronics", "Laptops", "13-inch gaming"],
  label = "Current page",
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: CurrentPageEmphasisProps) {
  const [at, setAt] = useState(trail.length - 1);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function pick(e: ClickEvt, i: number) {
    e.preventDefault();
    setAt(at === i ? trail.length - 1 : i);
  }

  return (
    <div className={styles.ce} style={vars}>
      <nav aria-label="Breadcrumb">
        <ol className={styles.list}>
          {trail.map((text, i) => (
            <li key={text} hidden={i > at}>
              {i === trail.length - 1
                ? <span className={[styles.crumb, i === at ? styles.cur : ""].join(" ")} aria-current={i === at ? "page" : undefined}>{text}</span>
                : <a
                    className={[styles.crumb, i === at ? styles.cur : ""].join(" ")}
                    href="#"
                    aria-current={i === at ? "page" : undefined}
                    onClick={(e: ClickEvt): void => pick(e, i)}
                  >{text}</a>}
            </li>
          ))}
        </ol>
      </nav>
      <p className={styles.say} aria-live="polite">
        <IconCheck /><span>{label}</span> · <span className={styles.val}>{trail[at]}</span>
      </p>
    </div>
  );
}
