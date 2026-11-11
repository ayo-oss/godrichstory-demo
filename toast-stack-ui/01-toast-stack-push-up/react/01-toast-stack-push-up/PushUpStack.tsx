import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PushUpStack.module.scss";

export type PushUpStackProps = {
  items?: string[];
  label?: string;
  regionLabel?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// React 이벤트 타입은 'react' 에서 import 하지 않는다 — 포트 안에서 필요한 모양만 선언한다
type ClickEvt = { preventDefault: () => void };

export default function PushUpStack({
  items = ["Saved the file", "Someone left a comment", "Upload finished"],
  label = "Send one more",
  regionLabel = "Notification stack",
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: PushUpStackProps) {
  const [demo, setDemo] = useState(true);
  const [rows, setRows] = useState<{ id: number; text: string }[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const before = useRef<number[]>([]);
  const seq = useRef<number[]>([0]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function push(e: ClickEvt) {
    e.preventDefault();
    const el = listRef.current;
    before.current = el ? Array.from(el.children).map((c) => (c as HTMLElement).getBoundingClientRect().top) : [];
    const n = (seq.current ?? [0])[0];
    if (seq.current) seq.current[0] = n + 1;
    setDemo(false);
    setRows((v) => [{ id: n, text: items[n % items.length] }, ...v].slice(0, 3));
  }

  // FLIP — 새 줄이 들어가 레이아웃이 바뀐 **뒤**에 옛 위치로 되돌렸다가 한 프레임 뒤에 풀어 준다
  useEffect(() => {
    const el = listRef.current;
    const old = before.current ?? [];
    if (!el || !old.length) return;
    const kids = Array.from(el.children) as HTMLElement[];
    kids.forEach((node, i) => {
      if (!i) return;
      node.style.transition = "none";
      node.style.transform = `translateY(${old[i - 1] - node.getBoundingClientRect().top}px)`;
    });
    requestAnimationFrame(() => {
      kids.forEach((node, i) => {
        if (!i) return;
        node.style.transition = "";
        node.style.transform = "";
      });
    });
    before.current = [];
  }, [rows]);

  const shown = demo ? items.slice(0, 3).map((text, i) => ({ id: -1 - i, text })) : rows;

  return (
    <div className={`${styles.pu} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.stack}>
        <div className={styles.list} ref={listRef} role="region" aria-label={regionLabel} aria-live="polite">
          {shown.map((row) => (
            <article key={row.id} className={`${styles.item} ${demo ? "" : styles.isIn}`}>
              <span className={styles.ic} aria-hidden="true">
                <svg viewBox="0 0 256 256" width="18" height="18"><g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" /><path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" /></g></svg>
              </span>
              <span className={styles.msg}>{row.text}</span>
            </article>
          ))}
        </div>
      </div>
      <button className={styles.go} type="button" onClick={push}>{label}</button>
    </div>
  );
}
