import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LogoCloud.module.scss";

export type LogoCloudProps = { duration?: number; easing?: string; color?: string; names?: string[] };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DEFAULT_NAMES = ["NORTHWARD", "ORBITAL", "VESTA LABS", "KAIROS", "ATLAS CO", "LUMEN"];

export default function LogoCloud({ duration = 9000, easing = "linear", color = "#17141a", names = DEFAULT_NAMES }: LogoCloudProps) {
  const [paused, setPaused] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const track = [...names, ...names];

  return (
    <section className={styles.lc} style={vars}>
      <p className={styles.label}>
        <span className={styles.badge} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="16" height="16">
            <g fill="currentColor">
              <path d="M232 128c0 12.51-17.82 21.95-22.68 33.69c-4.68 11.32 1.42 30.65-7.78 39.85s-28.53 3.1-39.85 7.78C150 214.18 140.5 232 128 232s-22-17.82-33.69-22.68c-11.32-4.68-30.65 1.42-39.85-7.78s-3.1-28.53-7.78-39.85C41.82 150 24 140.5 24 128s17.82-22 22.68-33.69c4.68-11.31-1.42-30.65 7.78-39.85s28.54-3.1 39.85-7.78C106.05 41.82 115.5 24 128 24s22 17.82 33.69 22.68c11.32 4.68 30.65-1.42 39.85 7.78s3.1 28.53 7.78 39.85C214.18 106.05 232 115.5 232 128" opacity=".2" />
              <path d="m165.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L104 148.69l50.34-50.35a8 8 0 0 1 11.32 0" />
            </g>
          </svg>
        </span>
        500개 넘는 팀이 이미 쓰고 있어요
      </p>
      <button type="button" className={styles.toggle} aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
        {paused ? "재생" : "일시정지"}
      </button>
      <div className={styles.viewport}>
        <ul className={styles.track} aria-hidden="true" data-paused={paused}>
          {track.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      </div>
      <p className={styles.srOnly}>함께하는 회사: {names.join(", ")}</p>
    </section>
  );
}
