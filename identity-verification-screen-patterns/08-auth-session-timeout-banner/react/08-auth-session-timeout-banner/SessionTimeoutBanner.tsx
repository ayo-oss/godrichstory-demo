import { useEffect, useState } from "react";
import styles from "./SessionTimeoutBanner.module.scss";

export type SessionTimeoutBannerProps = {
  /** 세션 만료까지 남은 초 (기본 30) */
  seconds?: number;
  onExtend?: () => void;
};

/** 마운트·연장마다 seconds 초를 세고, 0 이 되기 전에 Extend 를 누르면 다시 처음부터 센다 */
export default function SessionTimeoutBanner({ seconds = 30, onExtend }: SessionTimeoutBannerProps) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [left]);
  const extend = () => {
    setLeft(seconds);
    onExtend?.();
  };
  return (
    <div className={styles.banner} role="alert">
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 256 256">
          <g fill="currentColor"><path d="M208 192H48a8 8 0 0 1-6.88-12C47.71 168.6 56 139.81 56 104a72 72 0 0 1 144 0c0 35.82 8.3 64.6 14.9 76a8 8 0 0 1-6.9 12" opacity=".2" /><path d="M221.8 175.94c-5.55-9.56-13.8-36.61-13.8-71.94a80 80 0 1 0-160 0c0 35.34-8.26 62.38-13.81 71.94A16 16 0 0 0 48 200h40.81a40 40 0 0 0 78.38 0H208a16 16 0 0 0 13.8-24.06M128 216a24 24 0 0 1-22.62-16h45.24A24 24 0 0 1 128 216m-80-32c7.7-13.24 16-43.92 16-80a64 64 0 1 1 128 0c0 36.05 8.28 66.73 16 80Z" /></g>
        </svg>
      </span>
      <p className={styles.text}>Your session ends in <span className={styles.count}>{left}</span>s</p>
      <button className={styles.extend} type="button" onClick={extend}>Extend</button>
    </div>
  );
}
