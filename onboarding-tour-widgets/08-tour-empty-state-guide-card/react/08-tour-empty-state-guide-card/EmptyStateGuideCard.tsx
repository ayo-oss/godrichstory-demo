import type { CSSProperties } from "react";
import styles from "./EmptyStateGuideCard.module.scss";

export type EmptyStateGuideCardProps = {
  duration?: number;
  easing?: string;
  color?: string;
  title?: string;
  ctaLabel?: string;
  onCta?: () => void;
};

// dasharray 10 + 8 = 18. 한 주기에 정확히 18 을 흘려야 이음매가 안 생긴다
const DASH = 18;

export default function EmptyStateGuideCard({
  duration = 2000,
  easing = "linear",
  color = "#ff9ebb",
  title = "Add your first project",
  ctaLabel = "Create project",
  onCta,
}: EmptyStateGuideCardProps) {
  const vars: CSSProperties = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--dash": `${-DASH}`,
  } as CSSProperties;

  return (
    <div className={styles.empty} style={vars}>
      {/* border-style: dashed 는 흐르게 할 수 없다. SVG stroke-dashoffset 으로 흘린다 */}
      <svg className={styles.edge} viewBox="0 0 240 128" preserveAspectRatio="none" aria-hidden="true">
        <rect
          x="1" y="1" width="238" height="126" rx="16" ry="16"
          fill="none" stroke="#e8a8c0" strokeWidth="2" strokeDasharray="10 8"
        />
      </svg>
      <span className={styles.fi} aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">
          <path d="M208,88v24H69.77a8,8,0,0,0-7.59,5.47L32,208V64a8,8,0,0,1,8-8H93.33a8,8,0,0,1,4.8,1.6L128,80h72A8,8,0,0,1,208,88Z" opacity="0.2" />
          <path d="M245,110.64A16,16,0,0,0,232,104H216V88a16,16,0,0,0-16-16H130.67L102.94,51.2a16.14,16.14,0,0,0-9.6-3.2H40A16,16,0,0,0,24,64V208a8,8,0,0,0,8,8H211.1a8,8,0,0,0,7.59-5.47l28.49-85.47A16.05,16.05,0,0,0,245,110.64ZM93.34,64,123.2,86.4A8,8,0,0,0,128,88h72v16H69.77a16,16,0,0,0-15.18,10.94L40,158.7V64Zm112,136H43.1l26.67-80H232Z" />
        </svg>
      </span>
      <p className={styles.tt}>{title}</p>
      <button type="button" className={styles.cta} onClick={onCta}>{ctaLabel}</button>
    </div>
  );
}
