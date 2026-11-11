import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AnchorPriceStack.module.scss";

export type AnchorPriceStackProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--i"?: string };

const ROWS = [
  { label: "정가", kind: "orig" },
  { label: "첫 달 할인가", kind: "deal" },
  { label: "쿠폰 적용가", kind: "final" },
  { label: "", kind: "save" },
];

export default function AnchorPriceStack({
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: AnchorPriceStackProps) {
  const [open, setOpen] = useState(false);
  // 측정용 루프: 처음 조작(pointerdown·keydown)에서 루프를 끈다 — vanilla 판과 같은 동작
  const [demo, setDemo] = useState(true);
  useEffect(() => {
    const off = () => setDemo(false);
    window.addEventListener("pointerdown", off, { once: true });
    window.addEventListener("keydown", off, { once: true });
    return () => {
      window.removeEventListener("pointerdown", off);
      window.removeEventListener("keydown", off);
    };
  }, []);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.ap, open ? styles.isOpen : "", demo ? styles.isDemo : ""].join(" ");

  return (
    <section className={cls} style={vars}>
      <header className={styles.head}>
        <span className={styles.ic} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="20" height="20">
            <g fill="currentColor">
              <path d="M237.66 153L153 237.66a8 8 0 0 1-11.31 0l-99.35-99.32a8 8 0 0 1-2.34-5.65V40h92.69a8 8 0 0 1 5.65 2.34l99.32 99.32a8 8 0 0 1 0 11.34" opacity=".2" />
              <path d="M243.31 136L144 36.69A15.86 15.86 0 0 0 132.69 32H40a8 8 0 0 0-8 8v92.69A15.86 15.86 0 0 0 36.69 144L136 243.31a16 16 0 0 0 22.63 0l84.68-84.68a16 16 0 0 0 0-22.63m-96 96L48 132.69V48h84.69L232 147.31ZM96 84a12 12 0 1 1-12-12a12 12 0 0 1 12 12" />
            </g>
          </svg>
        </span>
        <div className={styles.tt}>
          <p className={styles.plan}>스타터 플랜</p>
          <p className={styles.sub}>첫 달 요금 알아보기</p>
        </div>
      </header>

      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls="ap-panel"
        onClick={() => setOpen(!open)}
      >
        <span>가격 구성 보기</span>
        <svg className={styles.chev} viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className={styles.panel} id="ap-panel">
        <div className={styles.panelIn}>
          <ul className={styles.stack}>
            {ROWS.map((r, i) => {
              const rowVars: Vars = { "--i": String(i) };
              if (r.kind === "save") {
                return (
                  <li key={r.kind} className={`${styles.row} ${styles.rowSave}`} style={rowVars}>
                    <span className={styles.save}>₩38,700 절약</span>
                  </li>
                );
              }
              return (
                <li key={r.kind} className={styles.row} style={rowVars}>
                  <span className={styles.label}>{r.label}</span>
                  {r.kind === "orig" && (
                    <span className={styles.orig}>
                      ₩59,000
                      <span className={styles.strike} aria-hidden="true" />
                    </span>
                  )}
                  {r.kind === "deal" && <b className={styles.deal}>₩29,000</b>}
                  {r.kind === "final" && <span className={styles.final}>₩20,300</span>}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
