import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MobileBackParent.module.scss";

export type BackCrumb = { name: string };

export type MobileBackParentProps = {
  crumbs?: BackCrumb[];
  duration?: number;
  easing?: string;
  color?: string;
};

// 도구/demo.py 의 ambient.d.ts 는 React 이벤트 제네릭을 안 준다 — 로컬 타입으로 TS7006 을 막는다
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Mq = { matches: boolean; addEventListener(t: string, fn: () => void): void; removeEventListener(t: string, fn: () => void): void };

const IconCaretRight = () => (
  <svg viewBox="0 0 256 256" width="12" height="12" aria-hidden="true"><g fill="currentColor"><path d="m176 128l-80 80V48Z" opacity=".2"/><path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z"/></g></svg>
);
const IconCaretLeft = () => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true"><g fill="currentColor"><path d="M160 48v160l-80-80Z" opacity=".2"/><path d="M163.06 40.61a8 8 0 0 0-8.72 1.73l-80 80a8 8 0 0 0 0 11.32l80 80A8 8 0 0 0 168 208V48a8 8 0 0 0-4.94-7.39M152 188.69L91.31 128L152 67.31Z"/></g></svg>
);

const DEFAULT_CRUMBS: BackCrumb[] = [
  { name: "Home" },
  { name: "Electronics" },
  { name: "Laptops" },
  { name: "13-inch gaming" },
];

export default function MobileBackParent({
  crumbs = DEFAULT_CRUMBS,
  duration = 300,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#fff7e6",
}: MobileBackParentProps) {
  const [narrow, setNarrow] = useState(false);
  const [manual, setManual] = useState<boolean | null>(null);   // null = 미디어 질의를 따른다
  const [demo, setDemo] = useState(true);                       // 격자 미리보기용 자동 루프
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    const mq = (window as { matchMedia(q: string): Mq }).matchMedia("(max-width: 420px)");
    const onChange = (): void => { setManual(null); setNarrow(mq.matches); setDemo(false); };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    return () => { if (mq.removeEventListener) mq.removeEventListener("change", onChange); };
  }, []);

  function force(v: boolean) {
    setManual(v);
    setNarrow(v);
    setDemo(false);
  }

  const parent = crumbs[crumbs.length - 2];

  return (
    <div className={`${styles.mb} ${demo ? styles.demo : ""} ${narrow ? styles.isNarrow : ""}`} style={vars}>
      <div className={styles.viewport}>
        <nav className={styles.nav} aria-label="Breadcrumb">
          <ol className={styles.wide}>
            {crumbs.map((c: BackCrumb, i: number) => (
              <li key={c.name} className={styles.li}>
                {i > 0 && <span className={styles.sep} aria-hidden="true"><IconCaretRight /></span>}
                {i === crumbs.length - 1 ? (
                  <span className={`${styles.crumb} ${styles.now}`} aria-current="page">{c.name}</span>
                ) : (
                  <a className={styles.crumb} href="#">{c.name}</a>
                )}
              </li>
            ))}
          </ol>
          <ol className={styles.narrowOl}>
            <li className={styles.li}>
              <button
                type="button"
                className={styles.back}
                aria-label={`Go back to ${parent ? parent.name : ""}`}
                onClick={(): void => { setNarrow(false); setDemo(false); }}
              >
                <IconCaretLeft />{parent ? parent.name : ""}
              </button>
            </li>
          </ol>
        </nav>
      </div>
      <div className={styles.chips} role="group" aria-label="Screen width">
        <button type="button" className={styles.chip} aria-pressed={!narrow} onClick={(): void => force(false)}>Wide screen</button>
        <button type="button" className={styles.chip} aria-pressed={narrow} onClick={(): void => force(true)}>Narrow screen</button>
      </div>
    </div>
  );
}
