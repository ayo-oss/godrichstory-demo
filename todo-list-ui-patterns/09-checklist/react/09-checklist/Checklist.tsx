// Checklist — vanilla 판(run/377/demo/09-checklist/index.html) 의 React 포트.
// 계산 겹: 체크 비율을 각도로 바꿔 conic-gradient 로 그린다. 100% 가 되는 순간에만 shine 이 한 번 재생된다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./Checklist.module.scss";

type Box<T> = { current: T };
type WrapVars = CSSProperties & { "--ring-w"?: string };
type GaugeVars = CSSProperties & { "--fill-deg"?: string };

const GAUGE_RING_WIDTH = 6;

const ROWS = [
  { id: 0, text: "치과 예약 확인" },
  { id: 1, text: "식료품 정리" },
  { id: 2, text: "이메일 회신" },
  { id: 3, text: "운동 30분" },
];

export default function Checklist() {
  const [isDemo, setIsDemo] = useState(true);
  const [done, setDone] = useState(ROWS.map(function () { return false; }));
  const [shineKey, setShineKey] = useState(0);
  const [justToggled, setJustToggled] = useState(-1);
  const wasFullRef = useRef(false) as unknown as Box<boolean>;
  const timerRef = useRef(0) as unknown as Box<number>;
  const flashTimerRef = useRef(0) as unknown as Box<number>;

  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function human() {
    if (isDemo) { setIsDemo(false); window.clearInterval(timerRef.current); }
  }

  const total = ROWS.length;
  const doneCount = done.filter(Boolean).length;
  const ratio = doneCount / total;
  const deg = ratio * 360;
  const pct = Math.round(ratio * 100);

  useEffect(function () {
    if (ratio >= 1 && !wasFullRef.current) {
      wasFullRef.current = true;
      if (!reduce) setShineKey(function (k) { return k + 1; });
    } else if (ratio < 1) {
      wasFullRef.current = false;
    }
    // eslint-disable-next-line
  }, [ratio]);

  function toggle(i: number) {
    human();
    setDone(function (prev) {
      const n = prev.slice();
      n[i] = !n[i];
      return n;
    });
    // 계산 겹 2: 토글된 행만 잠깐 밝아졌다가 스스로 꺼진다
    setJustToggled(i);
    window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(function () { setJustToggled(-1); }, 380);
  }

  function resetAll() {
    setDone(ROWS.map(function () { return false; }));
  }

  useEffect(function () {
    if (reduce) return;
    let cursor = 0;
    function autoStep() {
      if (cursor >= ROWS.length) { resetAll(); cursor = 0; return; }
      const i = cursor;
      setDone(function (prev) {
        const n = prev.slice();
        n[i] = true;
        return n;
      });
      // 계산 겹 2: 자동 재생 중에도 방금 체크된 행이 잠깐 밝아진다(toggle() 과 동일한 플래시)
      setJustToggled(i);
      window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(function () { setJustToggled(-1); }, 380);
      cursor++;
    }
    autoStep();
    timerRef.current = window.setInterval(autoStep, 480);
    return function () { window.clearInterval(timerRef.current); window.clearTimeout(flashTimerRef.current); };
    // eslint-disable-next-line
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + (isDemo ? " " + styles.isDemo : "")} style={{ "--ring-w": GAUGE_RING_WIDTH + "px" } as WrapVars}>
        <div className={styles.gauge} style={{ "--fill-deg": deg + "deg" } as GaugeVars}>
          <div className={styles.gaugeHole}>
            <span className={styles.gaugePct}>{pct}%</span>
          </div>
          <span key={shineKey} className={styles.shine + (shineKey > 0 ? " " + styles.play : "")} aria-hidden="true" />
        </div>
        <ul className={styles.list}>
          {ROWS.map(function (row, i) {
            return (
              <li key={row.id} className={styles.row + (justToggled === i ? " " + styles.justToggled : "")} data-done={done[i] ? "1" : "0"}>
                <button
                  className={styles.check}
                  type="button"
                  role="checkbox"
                  aria-checked={done[i]}
                  aria-label={row.text}
                  onClick={function () { toggle(i); }}
                  onKeyDown={function (e: KeyboardEvent) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(i); } }}
                >
                  <span className={styles.checkMark} aria-hidden="true">
                    {done[i] ? (
                      <svg viewBox="0 0 256 256">
                        <g fill="currentColor">
                          <path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32" />
                        </g>
                      </svg>
                    ) : null}
                  </span>
                </button>
                <span className={styles.rowText}>{row.text}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
