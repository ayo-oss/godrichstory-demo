import type { CSSProperties } from "react";
import styles from "./VolumeKnob.module.scss";

export type VolumeKnobProps = {
  label?: string;
  /** 스크린리더용 섹션 이름 (기본 "볼륨 노브") */
  ariaLabel?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function VolumeKnob({
  label = "음량 조절",
  ariaLabel = "볼륨 노브",
  duration = 2000,
  easing = "ease-out",
  color = "#2b2831",
}: VolumeKnobProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.volknob} style={vars} aria-label={ariaLabel}>
      <span className={styles.icon} aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M80 88v80H32a8 8 0 0 1-8-8V96a8 8 0 0 1 8-8Z" opacity=".2"/><path d="M155.51 24.81a8 8 0 0 0-8.42.88L77.25 80H32a16 16 0 0 0-16 16v64a16 16 0 0 0 16 16h45.25l69.84 54.31A8 8 0 0 0 160 224V32a8 8 0 0 0-4.49-7.19M32 96h40v64H32Zm112 111.64l-56-43.55V91.91l56-43.55Zm54-106.08a40 40 0 0 1 0 52.88a8 8 0 0 1-12-10.58a24 24 0 0 0 0-31.72a8 8 0 0 1 12-10.58M248 128a79.9 79.9 0 0 1-20.37 53.34a8 8 0 0 1-11.92-10.67a64 64 0 0 0 0-85.33a8 8 0 1 1 11.92-10.67A79.83 79.83 0 0 1 248 128"/></g></svg>
      </span>
      <div className={styles.panel}>
        <span className={`${styles.tick} ${styles.tick1}`} aria-hidden="true" />
        <span className={`${styles.tick} ${styles.tick2}`} aria-hidden="true" />
        <span className={`${styles.tick} ${styles.tick3}`} aria-hidden="true" />
        <span className={`${styles.tick} ${styles.tick4}`} aria-hidden="true" />
        <span className={`${styles.tick} ${styles.tick5}`} aria-hidden="true" />
        <div className={styles.knob}>
          <span className={styles.needle} aria-hidden="true" />
        </div>
      </div>
      <p className={styles.label}>{label}</p>
    </section>
  );
}
