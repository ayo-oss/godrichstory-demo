import type { CSSProperties } from "react";
import styles from "./BentoFooter.module.scss";

export type BentoFooterProps = {
  groups?: { head: string; link: string }[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BentoFooter({
  groups = [
    { head: "Product", link: "Features" },
    { head: "Company", link: "About" },
    { head: "Support", link: "Help center" },
  ],
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: BentoFooterProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <footer className={styles.footer} style={vars}>
      {groups.map((g, i) => (
        <div key={g.head} className={styles.tile} style={{ animationDelay: `${-i * 0.66}s` }}>
          <p className={styles.head}>{g.head}</p>
          <p className={styles.link}>{g.link}</p>
        </div>
      ))}
    </footer>
  );
}
