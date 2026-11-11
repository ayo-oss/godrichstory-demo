import type { CSSProperties } from "react";
import styles from "./CtaBandTrust.module.scss";

export type CtaBandTrustProps = {
  title?: string;
  desc?: string;
  cta?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CtaBandTrust({
  title = "지금 무료로 시작하세요",
  desc = "신용카드 없이 14일 체험",
  cta = "데모 신청",
  duration = 2000,
  easing = "ease-out",
  color = "#1d4ed8",
}: CtaBandTrustProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <section className={styles.band} style={vars}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.desc}>{desc}</p>
      <button type="button" className={styles.btn}>{cta}</button>
    </section>
  );
}
