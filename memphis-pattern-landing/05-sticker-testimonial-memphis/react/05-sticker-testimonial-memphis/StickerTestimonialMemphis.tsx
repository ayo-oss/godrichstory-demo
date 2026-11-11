import type { CSSProperties, ReactNode } from "react";
import styles from "./StickerTestimonialMemphis.module.scss";

export type StickerTestimonialMemphisItem = { quote: string; name: string };

export type StickerTestimonialMemphisProps = {
  /** 후기 스티커 3장 */
  items?: StickerTestimonialMemphisItem[];
  /** 별점 스크린리더 라벨 */
  starsLabel?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 데모 무대 색(참고용) */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/* Phosphor duotone 별 — 색은 currentColor(코랄) */
const STAR: ReactNode = (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" aria-hidden="true" focusable="false"><g fill="currentColor"><path d="m229.06 108.79l-48.7 42l14.88 62.79a8.4 8.4 0 0 1-12.52 9.17L128 189.09l-54.72 33.65a8.4 8.4 0 0 1-12.52-9.17l14.88-62.79l-48.7-42A8.46 8.46 0 0 1 31.73 94l63.91-5.2l24.62-59.6a8.36 8.36 0 0 1 15.48 0l24.62 59.6l63.91 5.2a8.46 8.46 0 0 1 4.79 14.79" opacity=".2"/><path d="M239.18 97.26A16.38 16.38 0 0 0 224.92 86l-59-4.76l-22.78-55.09a16.36 16.36 0 0 0-30.27 0L90.11 81.23L31.08 86a16.46 16.46 0 0 0-9.37 28.86l45 38.83L53 211.75a16.38 16.38 0 0 0 24.5 17.82l50.5-31.08l50.53 31.08A16.4 16.4 0 0 0 203 211.75l-13.76-58.07l45-38.83a16.43 16.43 0 0 0 4.94-17.59m-15.34 5.47l-48.7 42a8 8 0 0 0-2.56 7.91l14.88 62.8a.37.37 0 0 1-.17.48c-.18.14-.23.11-.38 0l-54.72-33.65a8 8 0 0 0-8.38 0l-54.72 33.67c-.15.09-.19.12-.38 0a.37.37 0 0 1-.17-.48l14.88-62.8a8 8 0 0 0-2.56-7.91l-48.7-42c-.12-.1-.23-.19-.13-.5s.18-.27.33-.29l63.92-5.16a8 8 0 0 0 6.72-4.94l24.62-59.61c.08-.17.11-.25.35-.25s.27.08.35.25L153 91.86a8 8 0 0 0 6.75 4.92l63.92 5.16c.15 0 .24 0 .33.29s0 .4-.16.5"/></g></svg>
);

const CARDS = [styles.cardOne, styles.cardTwo, styles.cardThree];

export default function StickerTestimonialMemphis({
  items = [
    { quote: "“코드 몰라도 붙여서 됐어요”", name: "디자이너 지수" },
    { quote: "“랜딩이 한 주에 끝났어요”", name: "창업자 민준" },
    { quote: "“물결 경계를 훔쳐갔어요”", name: "프론트 아라" },
  ],
  starsLabel = "별 5개 중 5개",
  duration = 2000,
  easing = "ease-out",
  color = "#ff8fab",
}: StickerTestimonialMemphisProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.stickm} style={vars}>
      {items.map((it, i) => (
        <article key={it.name} className={`${styles.card} ${CARDS[i % CARDS.length]}`}>
          <p className={styles.stars} aria-label={starsLabel}>{STAR}</p>
          <p className={styles.quote}>{it.quote}</p>
          <p className={styles.name}>{it.name}</p>
        </article>
      ))}
    </section>
  );
}
