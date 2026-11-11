import type { CSSProperties } from "react";
import styles from "./FeatureListCitrus.module.scss";

export type FeatureListCitrusItem = { label: string; tone: "a" | "b" | "c" | "d" };

export type FeatureListCitrusProps = {
  items?: FeatureListCitrusItem[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DEFAULT_ITEMS: FeatureListCitrusItem[] = [
  { label: "끌어다 놓기", tone: "a" },
  { label: "템플릿 고르기", tone: "b" },
  { label: "색 바꾸기", tone: "c" },
  { label: "공유하기", tone: "d" },
];

export default function FeatureListCitrus({
  items = DEFAULT_ITEMS,
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#ff9a52",
}: FeatureListCitrusProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <ul className={styles.listcitrus} style={vars}>
      {items.map((it, i) => (
        <li key={it.label} className={styles.row}>
          <span
            className={`${styles.drop} ${styles[`drop${it.tone.toUpperCase()}`]}`}
            aria-hidden="true"
            style={{ animationDelay: `${(-duration / 4) * i}ms` } as CSSProperties}
          />
          <span className={styles.label}>{it.label}</span>
        </li>
      ))}
    </ul>
  );
}
