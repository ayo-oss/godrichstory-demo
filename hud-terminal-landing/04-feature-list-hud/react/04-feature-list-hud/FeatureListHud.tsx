import type { CSSProperties } from "react";
import styles from "./FeatureListHud.module.scss";

export type FeatureListHudRow = { ts: string; text: string };

export type FeatureListHudProps = {
  rows?: FeatureListHudRow[];
  ok?: string;
  ready?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const defaultRows: FeatureListHudRow[] = [
  { ts: "00:01", text: "사용자 인증 확인" },
  { ts: "00:02", text: "위치 데이터 동기화" },
  { ts: "00:03", text: "이상 패턴 스캔" },
  { ts: "00:04", text: "백업 서버 연결" },
];

export default function FeatureListHud({
  rows = defaultRows,
  ok = "OK",
  ready = "READY",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffd23f",
}: FeatureListHudProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.list} style={vars}>
      <ul className={styles.rows}>
        {rows.map((row) => (
          <li key={row.ts} className={styles.row}>
            <span className={styles.ts}>{row.ts}</span>
            <span className={styles.text}>{row.text}</span>
            <span className={styles.ok}>{ok}</span>
          </li>
        ))}
      </ul>
      <p className={styles.cursorline}>
        {ready} <span className={styles.cursor} aria-hidden="true" />
      </p>
    </div>
  );
}
