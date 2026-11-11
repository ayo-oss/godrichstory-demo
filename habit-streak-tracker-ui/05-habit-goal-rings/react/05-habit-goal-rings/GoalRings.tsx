// GoalRings — vanilla 판(run/297/demo/05-habit-goal-rings/index.html) 의 React 포트.
// 반지름이 다른 세 링을 각자의 둘레(2πr)로 감고, 셋이 다 닫히면 조각을 한 번만 터뜨린다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GoalRings.module.scss";

export type GoalRingsProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type ShardVars = CSSProperties & { "--a"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

const STORE = "godrich-habit-rings";
const GOALS = [4, 3, 2];
const RADII = [50, 38, 26];
const NAMES = ["물 마시기", "운동 30분", "독서 20쪽"];
const BUTTONS = ["물 한 잔", "운동 10분", "책 5쪽"];
const SAY_TEXT = "세 목표 중 {n}개 달성";
const SHARDS = [0, 1, 2, 3, 4, 5, 6, 7];

export default function GoalRings({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ffd23f",
}: GoalRingsProps) {
  const [done, setDone] = useState<number[]>([3, 2, 1]);
  const [demo, setDemo] = useState(true);
  const [burst, setBurst] = useState(false);
  const timerRef = useRef<number>(0) as Box<number>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE);
      if (raw) { setDone(JSON.parse(raw) as number[]); }
    } catch (e) { /* 저장소가 막힌 창에서는 기본 기록 그대로 */ }
    return () => { window.clearTimeout(timerRef.current); };
  }, []);

  function save(next: number[]) {
    try { window.localStorage.setItem(STORE, JSON.stringify(next)); } catch (e) { /* 저장만 건너뛴다 */ }
  }
  function bump(k: number) {
    setDemo(false);
    const next = done.map((v, i) => (i === k ? (v >= GOALS[i] ? 0 : v + 1) : v));
    setDone(next);
    save(next);
    const closed = next.filter((v, i) => v >= GOALS[i]).length;
    if (closed === GOALS.length) {
      setBurst(false);
      window.clearTimeout(timerRef.current);
      // 다음 프레임에 다시 붙여야 같은 애니메이션이 처음부터 돈다
      timerRef.current = window.setTimeout(() => {
        setBurst(true);
        timerRef.current = window.setTimeout(() => setBurst(false), 900);
      }, 16);
    }
  }

  const ratios = done.map((v, i) => Math.min(v / GOALS[i], 1));
  const closed = ratios.filter((p) => p >= 1).length;
  const fillClass = [styles.fillA, styles.fillB, styles.fillC];
  const swatchClass = [styles.swatchA, styles.swatchB, styles.swatchC];
  const cls = [styles.root, demo ? styles.isDemo : "", burst ? styles.isDone : ""].filter(Boolean).join(" ");
  const shardVars = (a: number): ShardVars => ({ "--a": String(a) });

  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.main}>
          <div className={styles.ringBox}>
            <svg className={styles.svg} viewBox="0 0 128 128" aria-hidden="true">
              {RADII.map((r, i) => (
                <circle className={styles.track} cx="64" cy="64" r={r} key={`t${i}`} />
              ))}
              {RADII.map((r, i) => {
                const circ = 2 * Math.PI * r;   // 링마다 반지름이 다르니 둘레도 따로 잰다
                return (
                  <circle
                    className={`${styles.fill} ${fillClass[i]}`}
                    cx="64"
                    cy="64"
                    r={r}
                    key={`f${i}`}
                    style={{ strokeDasharray: String(circ), strokeDashoffset: String(circ * (1 - ratios[i])) }}
                  />
                );
              })}
            </svg>
            <span className={styles.burst} aria-hidden="true">
              {SHARDS.map((a) => <i className={styles.shard} key={a} style={shardVars(a)} />)}
            </span>
          </div>
          <ul className={styles.legend}>
            {NAMES.map((n, i) => (
              <li className={styles.item} key={i}>
                <i className={`${styles.swatch} ${swatchClass[i]}`} aria-hidden="true" />
                <span className={styles.name}>{n}</span>
                <b className={styles.pct}>{Math.round(ratios[i] * 100)}%</b>
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.say} role="status" aria-live="polite">
          {SAY_TEXT.replace("{n}", String(closed))}
        </p>
        <div className={styles.bar}>
          {BUTTONS.map((label, i) => (
            <button className={styles.go} type="button" key={i} onClick={() => bump(i)}>{label}</button>
          ))}
        </div>
      </div>
    </main>
  );
}
