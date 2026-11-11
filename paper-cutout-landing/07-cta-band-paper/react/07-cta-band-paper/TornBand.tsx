import type { CSSProperties } from "react";
import styles from "./TornBand.module.scss";

export type TornBandProps = {
  title?: string;
  cta?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 띠의 색종이 색. 흰 글자와 4.5:1 이상이어야 한다 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const ARROW = (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="m216 128l-72 72V56Z" opacity=".2"/><path d="m221.66 122.34l-72-72A8 8 0 0 0 136 56v64H40a8 8 0 0 0 0 16h96v64a8 8 0 0 0 13.66 5.66l72-72a8 8 0 0 0 0-11.32M152 180.69V75.31L204.69 128Z"/></g></svg>
);

export default function TornBand({
  title = "오늘 오려 붙이세요",
  cta = "부품 받기",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#cc3d26",
}: TornBandProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.tornband} style={vars}>
      <div className={styles.in}>
        <p className={styles.t}>{title}</p>
        <button className={styles.btn} type="button">
          <span>{cta}</span>
          <span className={styles.ic} aria-hidden="true">{ARROW}</span>
        </button>
      </div>
    </section>
  );
}
