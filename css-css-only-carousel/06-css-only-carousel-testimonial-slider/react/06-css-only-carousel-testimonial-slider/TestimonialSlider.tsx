import type { CSSProperties } from "react";
import styles from "./TestimonialSlider.module.scss";

const REVIEWS = [
  { avatar: "민", quote: "배송이 다음 날 바로 왔어요. 포장도 꼼꼼했습니다.", name: "김민지" },
  { avatar: "서", quote: "색상이 사진이랑 똑같아서 놀랐어요. 재구매 예정.", name: "이서준" },
  { avatar: "하", quote: "고객센터 응대가 빠르고 친절해서 믿음이 갑니다.", name: "박하은" },
];

export type TestimonialSliderProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TestimonialSlider({ duration = 2000, easing = "ease-out", color = "#2f6df6" }: TestimonialSliderProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.ts} style={vars}>
      {/* 카드 3장이 같은 grid 칸에 겹쳐 opacity 로만 순환 — 0줄 JS */}
      <div className={styles.stack}>
        {REVIEWS.map((r, i) => (
          <figure key={r.name} className={`${styles.card} ${styles["card" + (i + 1)]}`}>
            <span className={styles.avatar}>{r.avatar}</span>
            <blockquote className={styles.quote}>&quot;{r.quote}&quot;</blockquote>
            <figcaption className={styles.name}>{r.name}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
