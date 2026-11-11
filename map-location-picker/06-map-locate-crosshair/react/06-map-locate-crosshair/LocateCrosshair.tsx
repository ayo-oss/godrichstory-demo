import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LocateCrosshair.module.scss";

export type LocateCrosshairProps = {
  buttonLabel?: string;
  searchingLabel?: string;
  lockedLabel?: string;
  /** 스캔이 끝나고 위치가 잠기기까지 걸리는 시간(ms) */
  scanMs?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function LocateCrosshair({
  buttonLabel = "Find my location",
  searchingLabel = "Searching for your location",
  lockedLabel = "Your location · 12m",
  scanMs = 1400,
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: LocateCrosshairProps) {
  const [scanning, setScanning] = useState(true);
  const [locked, setLocked] = useState(false);
  const timer = useRef<number>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    if (!scanning) return;
    const id = window.setTimeout(() => { setScanning(false); setLocked(true); }, scanMs);
    timer.current = id;
    return () => window.clearTimeout(id);
  }, [scanning, scanMs]);

  function scan() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setLocked(false);
    setScanning(true);
  }

  const stateClass = `${scanning ? styles.isScanning : ""} ${locked ? styles.isLocked : ""}`;

  return (
    <div className={`${styles.lc} ${stateClass}`} style={vars}>
      <div className={styles.map}>
        <span className={`${styles.ring} ${styles.ring1}`} aria-hidden="true" />
        <span className={`${styles.ring} ${styles.ring2}`} aria-hidden="true" />
        <span className={`${styles.ring} ${styles.ring3}`} aria-hidden="true" />
        <span className={styles.cross} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="36" height="36">
            <g fill="currentColor">
              <path d="M160 128a32 32 0 1 1-32-32a32 32 0 0 1 32 32" opacity=".2" />
              <path d="M232 120h-8.34A96.14 96.14 0 0 0 136 32.34V24a8 8 0 0 0-16 0v8.34A96.14 96.14 0 0 0 32.34 120H24a8 8 0 0 0 0 16h8.34A96.14 96.14 0 0 0 120 223.66V232a8 8 0 0 0 16 0v-8.34A96.14 96.14 0 0 0 223.66 136H232a8 8 0 0 0 0-16m-96 87.6V200a8 8 0 0 0-16 0v7.6A80.15 80.15 0 0 1 48.4 136H56a8 8 0 0 0 0-16h-7.6A80.15 80.15 0 0 1 120 48.4V56a8 8 0 0 0 16 0v-7.6a80.15 80.15 0 0 1 71.6 71.6H200a8 8 0 0 0 0 16h7.6a80.15 80.15 0 0 1-71.6 71.6M128 88a40 40 0 1 0 40 40a40 40 0 0 0-40-40m0 64a24 24 0 1 1 24-24a24 24 0 0 1-24 24" />
            </g>
          </svg>
        </span>
        <span className={styles.dot} aria-hidden="true" />
      </div>
      <div className={styles.bar}>
        {/* 진짜 <button> 이라 클릭과 키보드 Enter·Space 가 모두 들어온다 */}
        <button type="button" className={styles.btn} onClick={scan}>
          <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
            <g fill="currentColor">
              <path d="M234.35 129L152 152l-23 82.35a8 8 0 0 1-15.21.27l-65.28-176a8 8 0 0 1 10.12-10.16l176 65.28a8 8 0 0 1-.28 15.26" opacity=".2" />
              <path d="M237.33 106.21L61.41 41l-.16-.05a16 16 0 0 0-20.35 20.3a1 1 0 0 0 .05.16l65.26 175.92A15.77 15.77 0 0 0 121.28 248h.3a15.77 15.77 0 0 0 15-11.29l.06-.2l21.84-78l78-21.84l.2-.06a16 16 0 0 0 .62-30.38Zm-87.49 38.09a8 8 0 0 0-5.54 5.54l-23 82.16l-.06-.17L56 56l175.82 65.22l.16.06Z" />
            </g>
          </svg>
          <span>{buttonLabel}</span>
        </button>
        <span className={styles.read}>
          <span className={styles.say} role="status" aria-live="polite">
            {locked ? lockedLabel : searchingLabel}
          </span>
        </span>
      </div>
    </div>
  );
}
