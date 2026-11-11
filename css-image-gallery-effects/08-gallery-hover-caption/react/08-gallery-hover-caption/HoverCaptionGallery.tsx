import type { CSSProperties } from "react";
import styles from "./HoverCaptionGallery.module.scss";

export type CaptionTile = { title: string; desc: string };

export type HoverCaptionGalleryProps = {
  items?: CaptionTile[];
  duration?: number;
  easing?: string;
  color?: string;
};

const DEFAULT_ITEMS: CaptionTile[] = [
  { title: "Sunset beach", desc: "Shot at 6 PM" },
  { title: "Cabin in the woods", desc: "Early morning walk" },
];

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 평소엔 살짝 가려진 캡션 띠가 호버하면 translateY 로 완전히 올라오며 제목·설명이 드러난다 */
export default function HoverCaptionGallery({
  items = DEFAULT_ITEMS,
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
}: HoverCaptionGalleryProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <ul className={styles.gallery} style={vars} aria-label="Photo gallery">
      {items.map((it, i) => (
        <li key={i} className={styles.tile} tabIndex={0}>
          <span className={styles.media} aria-hidden="true" />
          <div className={styles.caption}>
            <h3 className={styles.title}>{it.title}</h3>
            <p className={styles.desc}>{it.desc}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
