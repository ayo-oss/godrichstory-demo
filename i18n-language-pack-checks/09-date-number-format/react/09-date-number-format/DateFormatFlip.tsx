import type { CSSProperties } from "react";
import styles from "./DateFormatFlip.module.scss";

export type DateFormatFlipProps = {
  duration?: number;
  easing?: string;
  color?: string;
  formats?: { lang: string; date: string }[];
};

const DEFAULT_FORMATS = [
  { lang: "ko", date: "2026. 9. 11." },
  { lang: "en", date: "Sep 11, 2026" },
  { lang: "ja", date: "2026/09/11" },
];

export default function DateFormatFlip({
  duration = 2000,
  easing = "ease-out",
  color = "#fff7e6",
  formats = DEFAULT_FORMATS,
}: DateFormatFlipProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  const faceClass = [styles.faceKo, styles.faceEn, styles.faceJa];
  return (
    <div className={styles.stage} style={vars} aria-label="날짜 형식 플립 데모" role="img">
      <div className={styles.flipwrap}>
        <div className={styles.flip}>
          {formats.slice(0, 3).map((f, i) => (
            <div key={f.lang} className={`${styles.face} ${faceClass[i]}`}>
              <span className={styles.tag}>{f.lang}</span>
              <span className={styles.date}>{f.date}</span>
            </div>
          ))}
        </div>
        <p className={styles.langs}>
          {formats.slice(0, 3).map((f, i) => (
            <span key={f.lang} className={styles.langsItem} style={{ "--i": i } as CSSProperties}>{f.lang}</span>
          ))}
        </p>
      </div>
    </div>
  );
}
