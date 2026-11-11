import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CopyToClipboard.module.scss";

// 코드 줄 범위 복사 — sweep 의 위치·높이는 시작·끝 줄 번호 값의 차이로 매번 다시 구한다(계산 겹).
// navigator.clipboard 는 호출하지 않는다 — 라벨 전환으로 복사 성공만 흉내낸다.
const LINE_H = 22;
const LINES = ["const x = 1;", "const y = 2;", "const z = x + y;", "return z;"];
const IDLE_LABEL = "범위를 선택하면 복사됩니다";
const SCRIPT: [number, number][] = [[1, 1], [2, 3], [1, 4]];

type Range = { top: number; height: number; lo: number; hi: number };

function range(a: number, b: number): Range {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return { top: (lo - 1) * LINE_H, height: (hi - lo + 1) * LINE_H, lo, hi };
}

export default function CopyToClipboard() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<Range | null>(null);
  const [label, setLabel] = useState(IDLE_LABEL);
  const [labelDone, setLabelDone] = useState(false);
  const anchorRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const autoplayRef = useRef<number | null>(null);

  function select(startN: number, endN: number) {
    const r = range(startN, endN);
    setSel(r);
    setLabel(r.lo + "-" + r.hi + "줄 복사됨");
    setLabelDone(true);
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => {
      setLabel(IDLE_LABEL);
      setLabelDone(false);
    }, 900);
  }

  function stopAutoplay() {
    if (autoplayRef.current) {
      window.clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      let i = 0;
      autoplayRef.current = window.setInterval(() => {
        const pair = SCRIPT[i % SCRIPT.length];
        select(pair[0], pair[1]);
        i += 1;
      }, 680);
    }
    return () => {
      stopAutoplay();
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onNumClick(n: number) {
    rootRef.current?.classList.remove(styles["is-demo"]);
    stopAutoplay();
    if (anchorRef.current === null) {
      anchorRef.current = n;
      select(n, n);
    } else {
      select(anchorRef.current, n);
      anchorRef.current = null;
    }
  }

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.cc} ${styles["is-demo"]}`}>
        <div className={styles.cc__code}>
          {LINES.map((text, i) => {
            const n = i + 1;
            const inRange = !!sel && n >= sel.lo && n <= sel.hi;
            return (
              <div key={n} className={styles.cc__row}>
                <button
                  className={`${styles.cc__num} ${inRange ? styles["cc__num--sel"] : ""}`}
                  type="button"
                  onClick={() => onNumClick(n)}
                >
                  {n}
                </button>
                <span className={styles.cc__line}>{text}</span>
              </div>
            );
          })}
          <span
            className={`${styles.cc__sweep} ${sel ? styles["cc__sweep--on"] : ""}`}
            style={{ "--top": (sel?.top ?? 0) + "px", "--h": (sel?.height ?? 22) + "px" } as CSSProperties}
          />
        </div>
        <button className={`${styles.cc__label} ${labelDone ? styles["cc__label--done"] : ""}`} type="button">
          {label}
        </button>
      </div>
    </main>
  );
}
