import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FeatureHighlight.module.scss";

export type FeatureHighlightProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const FEATURES = ["가입 3분, 카드 등록 없음", "첫 달 요금 전액 면제", "해지 위약금 없음"];

export default function FeatureHighlight({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: FeatureHighlightProps) {
  const [active, setActive] = useState(0);
  const [offset, setOffset] = useState(0);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function go(i: number) {
    setActive(i);
  }

  function setRowRef(i: number) {
    return (el: HTMLLIElement | null) => {
      const rows = rowRefs.current || [];
      rows[i] = el;
      rowRefs.current = rows;
    };
  }

  // 실제 렌더 높이를 잰다 — 고정값을 짐작하면 반응형 구간에서 스포트라이트가 어긋난다(BD19 와 같은 병)
  useEffect(() => {
    const rows = rowRefs.current || [];
    const row = rows[active];
    const first = rows[0];
    if (row && first) setOffset(row.getBoundingClientRect().top - first.getBoundingClientRect().top);
  }, [active]);

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % FEATURES.length), 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <section className={styles.fh} style={vars}>
      <p className={styles.title}>왜 지금 시작해야 할까요</p>
      <ul className={styles.list} role="list">
        <span className={styles.spot} style={{ transform: `translateY(${offset}px)` }} aria-hidden="true">
          <span className={styles.spotFill} />
        </span>
        {FEATURES.map((label, i) => (
          <li
            key={label}
            ref={setRowRef(i)}
            className={`${styles.row} ${i === active ? styles.active : ""}`}
            tabIndex={0}
            role="button"
            aria-pressed={i === active}
            onClick={() => go(i)}
            onKeyDown={(e: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(i); } }}
          >
            <span className={styles.icon}>◆</span><span className={styles.label}>{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
