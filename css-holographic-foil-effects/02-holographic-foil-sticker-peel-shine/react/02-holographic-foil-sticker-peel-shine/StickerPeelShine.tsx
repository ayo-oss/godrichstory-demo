import type { CSSProperties } from "react";
import styles from "./StickerPeelShine.module.scss";

export type StickerPeelShineProps = {
  flag: string;
  /** 모서리가 더 들리는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 스티커 바탕색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function StickerPeelShine({
  flag,
  duration = 300,
  easing = "ease-out",
  color = "#fff7e6",
}: StickerPeelShineProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.sticker} style={vars} tabIndex={0}>
      <span className={styles.peel} aria-hidden="true" />
      <span className={styles.shine} aria-hidden="true" />
      <span className={styles.flag}>{flag}</span>
    </div>
  );
}
