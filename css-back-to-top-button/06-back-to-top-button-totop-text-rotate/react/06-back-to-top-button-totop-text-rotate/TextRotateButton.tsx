import type { CSSProperties } from "react";
import styles from "./TextRotateButton.module.scss";

export type TextRotateButtonProps = {
  /** 한 바퀴 도는 시간 (기본 8s) */
  duration?: number;
  label?: string;
  /** SVG textPath id — 한 페이지에 여러 개 두면 서로 다른 값을 준다 (기본 "totop-ring-path") */
  pathId?: string;
};

type Vars = CSSProperties & { "--duration"?: string };

export default function TextRotateButton({
  duration = 8000,
  label = "SCROLL TO TOP",
  pathId = "totop-ring-path",
}: TextRotateButtonProps) {
  const vars: Vars = { "--duration": `${duration}ms` };
  const text = `${label} · ${label} · `;
  return (
    <button
      type="button"
      className={styles.totop}
      style={vars}
      aria-label="맨 위로"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <svg className={styles.ring} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <path id={pathId} d="M32,32 m-24,0 a24,24 0 1,1 48,0 a24,24 0 1,1 -48,0" />
        </defs>
        <text className={styles.ringText}>
          <textPath href={`#${pathId}`} startOffset="0%">{text}</textPath>
        </text>
      </svg>
      <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="5,15 12,8 19,15" />
      </svg>
    </button>
  );
}
