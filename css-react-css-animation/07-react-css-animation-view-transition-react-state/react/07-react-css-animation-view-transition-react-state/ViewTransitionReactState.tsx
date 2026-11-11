import { CSSProperties, useState } from "react";
import { flushSync } from "react-dom";
import styles from "./ViewTransitionReactState.module.scss";

type DocWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => void;
};

export interface ViewTransitionReactStateProps {
  duration?: string;
  easing?: string;
}

export default function ViewTransitionReactState({
  duration = "600ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
}: ViewTransitionReactStateProps) {
  const [mode, setMode] = useState<"list" | "grid">("list");

  const toggle = () => {
    const doc = document as DocWithViewTransition;
    const next = mode === "list" ? "grid" : "list";
    if (doc.startViewTransition) {
      // startViewTransition needs the "after" DOM already painted by the time its
      // callback returns — flushSync forces that React commit synchronously instead
      // of letting React 18's automatic batching defer it past the snapshot.
      doc.startViewTransition(() => flushSync(() => setMode(next)));
    } else {
      setMode(next);
    }
  };

  const style: CSSProperties & { "--duration"?: string; "--easing"?: string } = {
    "--duration": duration,
    "--easing": easing,
  };

  return (
    <button className={styles.frame} style={style} onClick={toggle}>
      <span className={styles.chip}>{mode === "list" ? "List view" : "Grid view"}</span>
    </button>
  );
}
