import type { CSSProperties } from "react";
import styles from "./CtaWaveMemphis.module.scss";

export type CtaWaveMemphisProps = {
  head?: string;
  sub?: string;
  cta?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 밴드 색 — 그 위 글자는 잉크 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CtaWaveMemphis({
  head = "패턴이 필요한 순간이다",
  sub = "지금 붙여 넣고 다음 섹션으로",
  cta = "시작하기",
  duration = 2000,
  easing = "ease-out",
  color = "#ff5c47",
}: CtaWaveMemphisProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.ctam} style={vars}>
      <div className={styles.crest} aria-hidden="true"><span className={styles.wave} /></div>
      <div className={styles.body}>
        <div className={styles.text}>
          <h2 className={styles.head}>{head}</h2>
          <p className={styles.sub}>{sub}</p>
        </div>
        <button className={styles.btn} type="button">
          {cta}
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" aria-hidden="true" focusable="false"><g fill="currentColor"><path d="m216 128l-72 72V56Z" opacity=".2"/><path d="m221.66 122.34l-72-72A8 8 0 0 0 136 56v64H40a8 8 0 0 0 0 16h96v64a8 8 0 0 0 13.66 5.66l72-72a8 8 0 0 0 0-11.32M152 180.69V75.31L204.69 128Z"/></g></svg>
        </button>
      </div>
    </section>
  );
}
