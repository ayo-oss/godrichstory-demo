import type { CSSProperties } from "react";
import styles from "./CardGridMemphis.module.scss";

export type CardGridMemphisCard = { title: string; desc: string };

export type CardGridMemphisProps = {
  /** 카드 3장 (스티커·머리띠 무늬는 순서대로 고정) */
  cards?: CardGridMemphisCard[];
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 이번 편의 주역 — 굵은 잉크 테두리색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CardGridMemphis({
  cards = [
    { title: "패턴 만들기", desc: "점 찍듯 붙여 넣는 설계" },
    { title: "형상 얹기", desc: "반원과 삼각으로 포인트" },
    { title: "경계 나누기", desc: "지그재그로 섹션을 절단" },
  ],
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#241f26",
}: CardGridMemphisProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  /* 귀퉁이 스티커와 머리띠 무늬는 카드 순서대로 고정 */
  const deco = [
    [styles.stickerCircle, styles.bandDots],
    [styles.stickerHalf, styles.bandCross],
    [styles.stickerTri, styles.bandZig],
  ];

  return (
    <section className={styles.gridm} style={vars}>
      {cards.map((c, i) => {
        const [sticker, band] = deco[i % deco.length];
        return (
          <article key={c.title} className={styles.card}>
            <span className={`${styles.sticker} ${sticker}`} aria-hidden="true" />
            <div className={`${styles.band} ${band}`} aria-hidden="true" />
            <h2 className={styles.title}>{c.title}</h2>
            <p className={styles.desc}>{c.desc}</p>
          </article>
        );
      })}
    </section>
  );
}
