import type { CSSProperties } from "react";
import styles from "./CaptionRevealHoverScrim.module.scss";

export type CaptionRevealHoverScrimProps = {
  duration?: number;
  easing?: string;
  /** 사진 그러데이션 포인트 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const CARDS = [
  { tone: "a", caption: "Kyoto, 2024" },
  { tone: "b", caption: "Studio Nine" },
  { tone: "c", caption: "Seoul rooftop" },
];

/** 커서를 올리면 사진 전체 위로 어두운 스크림이 번지듯 깔리며 캡션이 함께 떠오른다 */
export default function CaptionRevealHoverScrim({
  duration = 300,
  easing = "ease-out",
  color = "#b9a0ff",
}: CaptionRevealHoverScrimProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <ul className={styles.gallery} style={vars} aria-label="A gallery of photos with captions">
      {CARDS.map((c, i) => (
        <li key={i} className={styles.card} tabIndex={0}>
          <span className={`${styles.img} ${styles["img-" + c.tone]}`} />
          <span className={styles.scrim} aria-hidden="true" />
          <span className={styles.caption}>{c.caption}</span>
        </li>
      ))}
    </ul>
  );
}
