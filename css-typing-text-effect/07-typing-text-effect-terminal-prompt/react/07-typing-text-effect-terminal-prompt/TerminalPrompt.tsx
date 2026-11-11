import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./TerminalPrompt.module.scss";

export type TerminalPromptProps = {
  command: string;
  response: string;
  /** 명령어→응답 두 단계를 담는 전체 루프 (기본 2000ms) */
  duration?: number;
  color?: string;
};

export default function TerminalPrompt({ command, response, duration = 2000, color = "#2f6df6" }: TerminalPromptProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    const cv = el && document.createElement("canvas").getContext("2d");
    if (!el || !cv) return;
    cv.font = getComputedStyle(el).font;
    el.style.setProperty("--full", Math.ceil(cv.measureText(command).width) + "px");
  }, [command]);
  const vars = { "--duration": `${duration}ms`, "--color": color, "--easing": `steps(${command.length}, end)` } as CSSProperties;
  return (
    <div className={styles.term} style={vars}>
      <div className={styles.bar}><span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} /></div>
      <p className={styles.line}>$ <span ref={ref} className={styles.cmd}>{command}</span></p>
      <p className={styles.resp}>{response}</p>
    </div>
  );
}
