// WeekDotCard — vanilla 판(run/297/demo/03-habit-checklist-week/index.html) 의 React 포트.
// 점은 진짜 <button> 이라 aria-pressed 로 눌린 상태가 그대로 읽히고, 링은 채운 칸 비율만큼 감긴다.
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./WeekDotCard.module.scss";

export type WeekDotCardProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type DotVars = CSSProperties & { "--i"?: string };

const STORE = "godrich-habit-week";
const DAYS = 7;
const TITLE = "이번 주 습관";
const NAMES = ["물 2L", "스트레칭", "책 20쪽"];
const DOT_LABEL = "{h} {d}일째";
const SAY_TEXT = "이번 주 {n}칸 채웠습니다";
const CIRC = 2 * Math.PI * 26;   // r=26 원의 둘레. stroke-dasharray 와 offset 이 이 값을 나눠 쓴다
const START: number[][] = [
  [1, 1, 1, 0, 1, 1, 0],
  [1, 1, 0, 1, 1, 0, 0],
  [1, 0, 1, 1, 0, 1, 0],
];

export default function WeekDotCard({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: WeekDotCardProps) {
  const [marks, setMarks] = useState<number[][]>(START);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE);
      if (raw) { setMarks(JSON.parse(raw) as number[][]); }
    } catch (e) { /* 저장소가 막힌 창에서는 기본 기록 그대로 */ }
  }, []);

  function save(next: number[][]) {
    try { window.localStorage.setItem(STORE, JSON.stringify(next)); } catch (e) { /* 저장만 건너뛴다 */ }
  }
  function toggle(r: number, d: number) {
    setDemo(false);
    const next = marks.map((row, ri) => row.map((v, di) => (ri === r && di === d ? (v ? 0 : 1) : v)));
    setMarks(next);
    save(next);
  }

  let filled = 0;
  for (let r = 0; r < marks.length; r++) {
    for (let d = 0; d < DAYS; d++) { filled += marks[r][d]; }
  }
  const ratio = filled / (marks.length * DAYS);
  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const dotVars = (i: number): DotVars => ({ "--i": String(i) });

  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.head}>
          <p className={styles.title}>{TITLE}</p>
          <p className={styles.say} role="status" aria-live="polite">
            {SAY_TEXT.replace("{n}", String(filled))}
          </p>
        </div>
        <div className={styles.main}>
          <div className={styles.rows}>
            {marks.map((row, r) => (
              <div className={styles.row} key={r}>
                <span className={styles.name}>{NAMES[r]}</span>
                <div className={styles.days}>
                  {row.map((v, d) => (
                    <button
                      className={styles.dot}
                      key={d}
                      type="button"
                      aria-pressed={v ? "true" : "false"}
                      aria-label={DOT_LABEL.replace("{h}", NAMES[r]).replace("{d}", String(d + 1))}
                      style={dotVars(r * DAYS + d)}
                      onClick={() => toggle(r, d)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className={styles.ringBox}>
            <svg className={styles.ring} viewBox="0 0 64 64" aria-hidden="true">
              <circle className={styles.track} cx="32" cy="32" r="26" />
              <circle
                className={styles.fill}
                cx="32"
                cy="32"
                r="26"
                style={{ strokeDasharray: String(CIRC), strokeDashoffset: String(CIRC * (1 - ratio)) }}
              />
            </svg>
            <b className={styles.pct}>{Math.round(ratio * 100)}%</b>
          </div>
        </div>
      </div>
    </main>
  );
}
