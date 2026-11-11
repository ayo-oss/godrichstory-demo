import type { CSSProperties } from "react";
import styles from "./TechStackTagCloud.module.scss";

export type TechStackTagCloudProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

const TAGS = ["CSS", "React", "TypeScript", "SCSS", "Figma", "Node"];

export default function TechStackTagCloud({
  duration = 2000,
  easing = "ease-out",
  color = "#6ec8ff",
}: TechStackTagCloudProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <ul className={styles.cloud} style={vars} aria-label="tech stack">
      {TAGS.map((tag, i) => (
        <li key={tag} style={{ animationDelay: `${i * 90}ms` }}>{tag}</li>
      ))}
    </ul>
  );
}
