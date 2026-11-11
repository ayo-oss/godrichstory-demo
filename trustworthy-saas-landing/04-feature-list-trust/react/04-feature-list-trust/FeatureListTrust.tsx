import type { CSSProperties } from "react";
import styles from "./FeatureListTrust.module.scss";

export type FeatureListTrustProps = {
  items?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const CHECK = (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2"/><path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32"/></g></svg>
);

export default function FeatureListTrust({
  items = ["무제한 팀원 초대", "감사 로그 90일 보관", "SSO · SAML 연동"],
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: FeatureListTrustProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const delays = [0, -1660, -1320];
  return (
    <ul className={styles.list} style={vars}>
      {items.map((text, i) => (
        <li key={text} className={styles.row} style={{ animationDelay: `${delays[i] ?? 0}ms` }}>
          <span className={styles.check} aria-hidden="true">{CHECK}</span>
          <span className={styles.text}>{text}</span>
        </li>
      ))}
    </ul>
  );
}
