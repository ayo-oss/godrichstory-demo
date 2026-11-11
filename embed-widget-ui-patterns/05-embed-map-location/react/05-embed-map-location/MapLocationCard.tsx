import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MapLocationCard.module.scss";

export type MapLocationCardProps = {
  duration?: number;
  easing?: string;
  color?: string;
  address?: string;
};

export default function MapLocationCard({ duration = 2000, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#2f6df6", address = "서울 마포구 어울마당로 100" }: MapLocationCardProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.card} style={vars}>
      <div className={styles.map} aria-hidden="true">
        <span className={`${styles.road} ${styles.roadH}`} />
        <span className={`${styles.road} ${styles.roadV}`} />
        <span className={styles.pin}>
          <svg viewBox="0 0 256 256" width="26" height="26"><g fill="currentColor">
            <path opacity=".2" d="M128 24a80 80 0 0 0-80 80c0 72 80 128 80 128s80-56 80-128a80 80 0 0 0-80-80m0 112a32 32 0 1 1 32-32a32 32 0 0 1-32 32" />
            <path d="M128 64a40 40 0 1 0 40 40a40 40 0 0 0-40-40m0 64a24 24 0 1 1 24-24a24 24 0 0 1-24 24m0-112a88.1 88.1 0 0 0-88 88c0 31.4 14.51 64.68 42 96.25a254.2 254.2 0 0 0 41.45 38.3a8 8 0 0 0 9.18 0a254.2 254.2 0 0 0 41.37-38.3c27.45-31.57 42-64.85 42-96.25a88.1 88.1 0 0 0-88-88m0 206c-16.53-13-72-60.75-72-118a72 72 0 0 1 144 0c0 57.23-55.47 105-72 118" />
          </g></svg>
        </span>
      </div>
      <div className={styles.body}>
        <p className={styles.addr}>{address}</p>
        <button className={styles.nav} type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <svg viewBox="0 0 256 256" width="15" height="15" aria-hidden="true"><g fill="currentColor">
            <path opacity=".2" d="M234.35 129L152 152l-23 82.35a8 8 0 0 1-15.21.27l-65.28-176a8 8 0 0 1 10.12-10.16l176 65.28a8 8 0 0 1-.28 15.26" />
            <path d="M237.33 106.21L61.41 41l-.16-.05a16 16 0 0 0-20.35 20.3a1 1 0 0 0 .05.16l65.26 175.92A15.77 15.77 0 0 0 121.28 248h.3a15.77 15.77 0 0 0 15-11.29l.06-.2l21.84-78l78-21.84l.2-.06a16 16 0 0 0 .62-30.38Z" />
          </g></svg>
          길찾기
        </button>
        {open && <p className={styles.info}>2.4km · 도보 32분 · 버스 12분</p>}
      </div>
    </div>
  );
}
