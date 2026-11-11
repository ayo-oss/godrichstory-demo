import styles from "./SmoothAnchorButton.module.scss";

export type SmoothAnchorButtonProps = {
  /** 스크롤 최상단에 둘 앵커 id (기본 "top") */
  targetId?: string;
};

// 실제 사용: 전역 CSS 에 html { scroll-behavior: smooth; } 한 줄만 있으면 된다. JS 는 0줄이다
export default function SmoothAnchorButton({ targetId = "top" }: SmoothAnchorButtonProps) {
  return (
    <a href={`#${targetId}`} className={styles.totop} aria-label="맨 위로">
      <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="5,15 12,8 19,15" />
      </svg>
    </a>
  );
}
