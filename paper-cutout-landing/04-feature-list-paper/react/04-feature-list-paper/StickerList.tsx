import type { CSSProperties } from "react";
import styles from "./StickerList.module.scss";

export type StickerListProps = {
  items?: string[];
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 스티커 색. 줄 순서대로 돈다 */
  colors?: string[];
};

type Vars = CSSProperties & {
  "--duration"?: string; "--easing"?: string; "--dot"?: string; "--delay"?: string; "--mark"?: string;
};

const CHECK = (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2"/><path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88"/></g></svg>
);

export default function StickerList({
  items = ["색은 세 가지까지만", "그림자는 한 방향", "모서리는 같은 반경", "글자는 잉크색 하나"],
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  colors = ["#2b7d5a", "#cc3d26", "#2f6fb8", "#f6c453"],
}: StickerListProps) {
  return (
    <ul className={styles.stickerlist}>
      {items.map((label, i) => {
        const dot = colors[i % colors.length];
        const vars: Vars = {
          "--duration": `${duration}ms`,
          "--easing": easing,
          "--dot": dot,
          "--mark": dot === "#f6c453" ? "#2a2320" : "#fff",
          "--delay": `${-duration + (duration / items.length) * i}ms`,
        };
        return (
          <li key={label} className={styles.row}>
            <span className={styles.dot} style={vars} aria-hidden="true">{CHECK}</span>
            <span className={styles.label}>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
