import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StepTransition.module.scss";

export type Crumb = { label: string; href?: string };

export type StepTransitionProps = {
  crumbs?: Crumb[];
  duration?: number;
  easing?: string;
  color?: string;
};

// 도구/demo.py 의 ambient.d.ts 는 React 이벤트 제네릭을 안 준다 — 로컬 타입으로 TS7006 을 막는다
type ClickEvt = { preventDefault(): void };
type AnimEvt = { currentTarget: { getAttribute(n: string): string | null } };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const IconHouse = () => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true"><g fill="currentColor"><path d="M216 120v96h-64v-64h-48v64H40v-96a8 8 0 0 1 2.34-5.66l80-80a8 8 0 0 1 11.32 0l80 80A8 8 0 0 1 216 120" opacity=".2"/><path d="m219.31 108.68l-80-80a16 16 0 0 0-22.62 0l-80 80A15.87 15.87 0 0 0 32 120v96a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-56h32v56a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-96a15.87 15.87 0 0 0-4.69-11.32M208 208h-48v-56a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8v56H48v-88l80-80l80 80Z"/></g></svg>
);
const IconCaretRight = () => (
  <svg viewBox="0 0 256 256" width="12" height="12" aria-hidden="true"><g fill="currentColor"><path d="m176 128l-80 80V48Z" opacity=".2"/><path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z"/></g></svg>
);

const DEFAULT_CRUMBS: Crumb[] = [
  { label: "Home", href: "#" },
  { label: "Docs", href: "#" },
  { label: "2026", href: "#" },
  { label: "Sep", href: "#" },
  { label: "Invoice" },
];

export default function StepTransition({
  crumbs = DEFAULT_CRUMBS,
  duration = 300,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#fff7e6",
}: StepTransitionProps) {
  const [shown, setShown] = useState(crumbs.length);   // 화면에 남은 칸 수
  const [leaving, setLeaving] = useState<number[]>([]); // 지금 왼쪽으로 빠지는 중인 칸
  const [entering, setEntering] = useState<number[]>([]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function cutTo(i: number) {
    const out: number[] = [];
    for (let k = shown - 1; k > i; k--) out.push(k);
    if (!out.length) return;
    setEntering([]);
    setLeaving(out);
  }

  function restore() {
    const back: number[] = [];
    for (let k = shown; k < crumbs.length; k++) back.push(k);
    if (!back.length) return;
    setLeaving([]);
    setShown(crumbs.length);
    setEntering(back);
  }

  function onEnd(e: AnimEvt) {
    const k = Number(e.currentTarget.getAttribute("data-k"));
    if (leaving.indexOf(k) >= 0) {
      setShown((p: number) => Math.min(p, k));
      setLeaving((p: number[]) => p.filter((x: number) => x !== k));
    } else {
      setEntering((p: number[]) => p.filter((x: number) => x !== k));
    }
  }

  return (
    <div className={styles.st} style={vars}>
      <div className={styles.rail}>
        <nav aria-label="Breadcrumb" className={styles.nav}>
          <ol className={styles.list}>
            {crumbs.map((c: Crumb, i: number) => {
              if (i >= shown && entering.indexOf(i) < 0) return null;
              const cls = [styles.item, leaving.indexOf(i) >= 0 ? styles.out : "", entering.indexOf(i) >= 0 ? styles.in : ""].join(" ");
              const last = i === crumbs.length - 1;
              return (
                <li key={c.label} className={cls} data-k={i} onAnimationEnd={onEnd}>
                  {i > 0 && <span className={styles.sep} aria-hidden="true"><IconCaretRight /></span>}
                  {last ? (
                    <span className={`${styles.link} ${styles.now}`} aria-current="page">{c.label}</span>
                  ) : (
                    <a className={styles.link} href={c.href} onClick={(e: ClickEvt): void => { e.preventDefault(); cutTo(i); }}>
                      {i === 0 && <IconHouse />}{c.label}
                    </a>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
      <div className={styles.btns}>
        <button type="button" className={styles.btn} onClick={(): void => cutTo(shown - 2)}>Go up</button>
        <button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={restore}>Go back down</button>
      </div>
    </div>
  );
}
