import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LiveViewerCounter.module.scss";

export type LiveViewerCounterProps = {
  /** 격자 미리보기용 루프 길이(ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type BarVars = CSSProperties & { "--i"?: number; "--v"?: number };

const initialBars = [0.42, 0.6, 0.48, 0.82, 0.55, 0.7, 0.92];

function Users() {
  return (
    <svg viewBox="0 0 256 256" width="20" height="20" aria-hidden="true">
      <g fill="currentColor">
        <path d="M136 108a52 52 0 1 1-52-52a52 52 0 0 1 52 52" opacity=".2" />
        <path d="M117.25 157.92a60 60 0 1 0-66.5 0a95.83 95.83 0 0 0-47.22 37.71a8 8 0 1 0 13.4 8.74a80 80 0 0 1 134.14 0a8 8 0 0 0 13.4-8.74a95.83 95.83 0 0 0-47.22-37.71M40 108a44 44 0 1 1 44 44a44.05 44.05 0 0 1-44-44m210.14 98.7a8 8 0 0 1-11.07-2.33A79.83 79.83 0 0 0 172 168a8 8 0 0 1 0-16a44 44 0 1 0-16.34-84.87a8 8 0 1 1-5.94-14.85a60 60 0 0 1 55.53 105.64a95.83 95.83 0 0 1 47.22 37.71a8 8 0 0 1-2.33 11.07" />
      </g>
    </svg>
  );
}

export default function LiveViewerCounter({
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: LiveViewerCounterProps) {
  const [n, setN] = useState(128);
  const [bars, setBars] = useState<number[]>(initialBars);
  const [msg, setMsg] = useState("이 페이지를 함께 보는 사람 수예요");
  const [loop, setLoop] = useState(true);

  // setInterval 이 1.2초마다 값을 ±1~6 옮기고(96~168), 그 값을 막대 7칸의 --v(=scaleY 배율)로 밀어 넣는다.
  // 읽어 주는 문장은 5번에 한 번만 갱신해 화면낭독기가 쉴 새 없이 떠들지 않게 한다.
  useEffect(() => {
    let count = 128;
    let tick = 0;
    let history = initialBars.slice();
    const id = setInterval(() => {
      let d = Math.floor(Math.random() * 6) + 1;
      if (Math.random() < 0.5) d = -d;
      count = Math.max(96, Math.min(168, count + d));
      history = history.slice(1).concat(Math.max(0.28, Math.min(1, (count - 88) / 84)));
      tick += 1;
      setN(count);
      setBars(history);
      if (tick % 5 === 0) setMsg(`지금 ${count}명이 이 페이지를 보고 있어요`);
    }, 1200);
    return () => clearInterval(id);
  }, []);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.lv, loop ? styles["is-demo"] : ""].filter(Boolean).join(" ");

  return (
    <section
      className={cls}
      style={vars}
      aria-label="실시간 시청자 수"
      onPointerDown={() => setLoop(false)}
      onKeyDown={() => setLoop(false)}
    >
      <div className={styles.lv__left}>
        <p className={styles.lv__head}>
          <span className={styles.lv__ic} aria-hidden="true"><Users /></span>
          <span className={styles.lv__live}>
            <span className={styles.lv__dot} aria-hidden="true" />
            실시간
          </span>
        </p>
        <p className={styles.lv__count}>
          지금 <b className={styles.lv__n}>{n}</b>명 보는 중
        </p>
        <p className={styles.lv__st} role="status" aria-live="polite">{msg}</p>
      </div>
      <div className={styles.lv__bars} aria-hidden="true">
        {bars.map((v, i) => {
          const bv: BarVars = { "--i": i, "--v": v };
          return (
            <span key={i} className={styles.lv__bar} style={bv}>
              <i />
            </span>
          );
        })}
      </div>
    </section>
  );
}
