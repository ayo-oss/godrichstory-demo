import type { CSSProperties } from "react";
import styles from "./CardGridLinear.module.scss";

export type CardGridLinearProps = {
  labels?: [string, string, string, string];
  /** 카드 한 장이 밝아졌다 가라앉는 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CardGridLinear({
  labels = ["자동 배포", "이슈 추적", "로드맵", "API 연동"],
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: CardGridLinearProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const delays = ["0s", `${-duration * 0.75}ms`, `${-duration * 0.5}ms`, `${-duration * 0.25}ms`];

  return (
    <section className={styles.grid} style={vars}>
      {labels.map((label, i) => (
        <article key={label} className={styles.card} style={{ animationDelay: delays[i] }}>
          <span className={styles.dot} aria-hidden="true" />
          <p className={styles.label}>{label}</p>
        </article>
      ))}
    </section>
  );
}
