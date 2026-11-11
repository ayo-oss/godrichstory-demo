import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import styles from "./OfflineRetryBanner.module.scss";

export type OfflineRetryBannerProps = {
  onlineText?: string;
  offlineText?: string;
  backText?: string;
  /** 온라인일 때 오른쪽 알약에 들어가는 짧은 라벨 */
  okLabel?: string;
  /** 카운트다운 숫자 뒤에 붙는 말 */
  unitLabel?: string;
  dropLabel?: string;
  restoreLabel?: string;
  /** 재시도까지 세는 초 */
  seconds?: number;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Status = "on" | "off" | "back";
// ambient 가 얇다 — 브라우저 전역 중 쓰는 것만 로컬 타입으로 좁혀 받는다
type Host = {
  setInterval(fn: () => void, ms: number): number;
  clearInterval(id: number): void;
  addEventListener(type: string, fn: () => void): void;
  removeEventListener(type: string, fn: () => void): void;
  navigator: { onLine: boolean };
};

const host = globalThis as unknown as Host;

function WifiOnIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor"><g><path d="m238.2 87.69l-104 125.43a8 8 0 0 1-12.3 0L17.8 87.69a7.79 7.79 0 0 1 1.31-11.21a180.75 180.75 0 0 1 217.78 0a7.79 7.79 0 0 1 1.31 11.21" opacity=".2"/><path d="M247.89 80.91a15.93 15.93 0 0 0-6.17-10.81A186.67 186.67 0 0 0 128 32A186.67 186.67 0 0 0 14.28 70.1a15.93 15.93 0 0 0-6.17 10.81a15.65 15.65 0 0 0 3.54 11.89l104 125.43A15.93 15.93 0 0 0 128 224a15.93 15.93 0 0 0 12.31-5.77l104-125.43a15.65 15.65 0 0 0 3.58-11.89M128 208L24.09 82.74A170.76 170.76 0 0 1 128 48a170.76 170.76 0 0 1 103.91 34.74Z"/></g></svg>
  );
}

function WifiOffIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor"><g><path d="m238.2 87.69l-104 125.43a8 8 0 0 1-12.3 0L17.8 87.69a7.79 7.79 0 0 1 1.31-11.21a180.75 180.75 0 0 1 217.78 0a7.79 7.79 0 0 1 1.31 11.21" opacity=".2"/><path d="M53.92 34.62a8 8 0 1 0-11.84 10.76l4.55 5A188 188 0 0 0 14.28 70.1a15.93 15.93 0 0 0-6.17 10.81a15.65 15.65 0 0 0 3.54 11.89l104 125.43A15.93 15.93 0 0 0 128 224a15.93 15.93 0 0 0 12.31-5.77l28.1-33.88l33.67 37a8 8 0 1 0 11.84-10.76ZM128 208L24.09 82.74a171.5 171.5 0 0 1 33.82-19.95l99.63 109.6ZM244.35 92.8l-49.42 59.58a8 8 0 0 1-12.32-10.21l49.3-59.43A170.76 170.76 0 0 0 128 48a175 175 0 0 0-32.39 3a8 8 0 1 1-3-15.72A190.6 190.6 0 0 1 128 32a186.67 186.67 0 0 1 113.72 38.1a15.93 15.93 0 0 1 6.17 10.81a15.65 15.65 0 0 1-3.54 11.89"/></g></svg>
  );
}

export default function OfflineRetryBanner({
  onlineText = "Connected",
  offlineText = "You are offline",
  backText = "Back online",
  okLabel = "Good signal",
  unitLabel = "s until retry",
  dropLabel = "Drop the connection",
  restoreLabel = "Bring it back",
  seconds = 3,
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#c2361a",
}: OfflineRetryBannerProps) {
  const [live, setLive] = useState(demo);
  const [status, setStatus] = useState<Status>("on");
  const [left, setLeft] = useState(0);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function drop() {
    setLive(false);
    setLeft(seconds);
    setStatus("off");
  }

  function restore() {
    setLive(false);
    setLeft(0);
    setStatus("back");
  }

  // 끊긴 동안에만 1초마다 한 칸씩 센다
  useEffect(() => {
    if (status !== "off") return;
    const id = host.setInterval(() => setLeft((p: number) => (p > 0 ? p - 1 : 0)), 1000);
    return () => host.clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status === "off" && left <= 0) setStatus("back");
  }, [status, left]);

  // 진짜 연결 상태도 읽는다
  useEffect(() => {
    const goOff = () => drop();
    const goOn = () => restore();
    host.addEventListener("offline", goOff);
    host.addEventListener("online", goOn);
    if (host.navigator && host.navigator.onLine === false) goOff();
    return () => {
      host.removeEventListener("offline", goOff);
      host.removeEventListener("online", goOn);
    };
  }, [seconds]);

  const cls = [
    styles.of,
    live ? styles.isDemo : "",
    status === "off" ? styles.isOff : "",
    status === "back" ? styles.isBack : "",
  ]
    .filter(Boolean)
    .join(" ");

  const ratio = seconds > 0 ? left / seconds : 0;
  // 세 문구·두 알약을 같은 자리에 겹쳐 두고 컷으로 갈아 끼운다 — 반투명 겹침도 칸 폭 변화도 없다
  const ticks: number[] = [];
  for (let n = seconds; n > 0; n -= 1) ticks.push(n);

  return (
    <section className={cls} style={vars}>
      {/* 띠는 사라지지 않는다 — 안의 문구와 색만 바뀐다 */}
      <div className={styles.bar} role="status" aria-live="polite">
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.ic} aria-hidden="true">
          <span className={styles.icOn}><WifiOnIcon /></span>
          <span className={styles.icOff}><WifiOffIcon /></span>
        </span>
        <span className={styles.msg}>
          <span className={[styles.m, styles.mOn].join(" ")}>{onlineText}</span>
          <span className={[styles.m, styles.mOff].join(" ")}>{offlineText}</span>
          <span className={[styles.m, styles.mBack].join(" ")}>{backText}</span>
        </span>
        <span className={styles.side}>
          <span className={[styles.pill, styles.pillWait].join(" ")}>
            <span className={styles.num} aria-hidden="true">
              {ticks.map((n) => (
                <span
                  key={n}
                  className={[styles.n, n === left ? styles.isNow : ""].filter(Boolean).join(" ")}
                  data-sec={n}
                >
                  {n}
                </span>
              ))}
            </span>
            <span className={styles.unit}>{unitLabel}</span>
          </span>
          <span className={[styles.pill, styles.pillOk].join(" ")}>{okLabel}</span>
        </span>
      </div>

      <div className={styles.track} aria-hidden="true">
        <span className={styles.rail} />
        <span className={styles.fill} style={{ transform: `scaleX(${status === "off" ? ratio : 1})` }} />
      </div>

      <button className={styles.btn} type="button" onClick={status === "off" ? restore : drop}>
        {status === "off" ? restoreLabel : dropLabel}
      </button>
    </section>
  );
}
