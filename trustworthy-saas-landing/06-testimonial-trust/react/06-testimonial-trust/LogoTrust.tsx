import type { CSSProperties } from "react";
import styles from "./LogoTrust.module.scss";

export type LogoTrustProps = {
  quote?: string;
  author?: string;
  logos?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function LogoTrust({
  quote = '"온보딩이 하루 만에 끝났습니다"',
  author = "— 니임버스 · 운영팀장",
  logos = ["Nimbus", "Ledger", "Northwind", "Vertex", "Harborline", "Anchorpay"],
  duration = 6000,
  easing = "linear",
  color = "#2f6df6",
}: LogoTrustProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const doubled = [...logos, ...logos];
  return (
    <div className={styles.wrap} style={vars}>
      <figure className={styles.quote}>
        <blockquote>{quote}</blockquote>
        <figcaption>{author}</figcaption>
      </figure>
      <div className={styles.viewport}>
        <div className={styles.track} aria-hidden="true">
          {doubled.map((name, i) => (
            <span key={`${name}-${i}`} className={styles.chip}>{name}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
