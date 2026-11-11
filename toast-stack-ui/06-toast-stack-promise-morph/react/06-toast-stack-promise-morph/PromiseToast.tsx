import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PromiseToast.module.scss";

export type PromiseState = "load" | "ok" | "bad";
export type PromiseToastProps = {
  words?: Record<PromiseState, string>;
  sub?: string;
  goLabel?: string;
  wait?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--easing"?: string; "--color"?: string };
const ORDER: PromiseState[] = ["load", "ok", "bad"];

const ICON: Record<PromiseState, any> = {
  load: <g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" /><path d="M232 128a104 104 0 0 1-208 0c0-41 23.81-78.36 60.66-95.27a8 8 0 0 1 6.68 14.54C60.15 61.59 40 93.27 40 128a88 88 0 0 0 176 0c0-34.73-20.15-66.41-51.34-80.73a8 8 0 0 1 6.68-14.54C208.19 49.64 232 87 232 128" /></g>,
  ok: <g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" /><path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" /></g>,
  bad: <g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" /><path d="M165.66 101.66L139.31 128l26.35 26.34a8 8 0 0 1-11.32 11.32L128 139.31l-26.34 26.35a8 8 0 0 1-11.32-11.32L116.69 128l-26.35-26.34a8 8 0 0 1 11.32-11.32L128 116.69l26.34-26.35a8 8 0 0 1 11.32 11.32M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" /></g>,
};

export default function PromiseToast({
  words = { load: "Uploading", ok: "Upload finished", bad: "Upload dropped" },
  sub = "12 photos · 34MB",
  goLabel = "Upload again",
  wait = 1500,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#6ec8ff",
}: PromiseToastProps) {
  const [demo, setDemo] = useState(true);
  const [state, setState] = useState<PromiseState>("load");
  const turn = useRef<number[]>([0]);
  const timer = useRef<number[]>([0]);
  const vars: Vars = { "--easing": easing, "--color": color };

  useEffect(() => () => { clearTimeout((timer.current ?? [0])[0]); }, []);

  function start() {
    setDemo(false);
    setState("load");
    const t = timer.current ?? [0];
    const n = turn.current ?? [0];
    clearTimeout(t[0]);
    t[0] = setTimeout(() => { setState(n[0]++ % 2 ? "bad" : "ok"); }, wait) as unknown as number;
  }

  return (
    <div className={`${styles.pm} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.card} data-state={state} role="status" aria-live="polite" aria-busy={state === "load"}>
        <span className={styles.slot} aria-hidden="true">
          {ORDER.map((s) => (
            <span key={s} className={styles.face} data-state={s} data-on={!demo && s === state ? "1" : "0"}>
              {s === "load"
                ? <span className={styles.spin}><svg viewBox="0 0 256 256" width="30" height="30">{ICON[s]}</svg></span>
                : <svg viewBox="0 0 256 256" width="30" height="30">{ICON[s]}</svg>}
            </span>
          ))}
        </span>
        <span className={styles.txt}>
          <span className={styles.words}>
            {ORDER.map((s) => (
              <span key={s} className={styles.word} data-state={s} data-on={!demo && s === state ? "1" : "0"}>{words[s]}</span>
            ))}
          </span>
          <span className={styles.sub}>{sub}</span>
        </span>
      </div>
      <button className={styles.go} type="button" onClick={start}>{goLabel}</button>
    </div>
  );
}
