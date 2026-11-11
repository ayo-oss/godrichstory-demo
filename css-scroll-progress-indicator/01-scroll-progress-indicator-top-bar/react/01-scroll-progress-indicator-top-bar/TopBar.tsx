import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TopBar.module.scss";

export type TopBarProps = {
  /** 바 두께 (기본 3px) */
  thickness?: number;
  /** 바 색 */
  color?: string;
};

type Vars = CSSProperties & { "--thickness"?: string; "--color"?: string };

// 실제 쓰임: 문서 스크롤 비율을 window scroll 로 재서 --scale 에 반영한다.
// scroll() 타임라인을 쓸 수 있는 브라우저(Chrome·Edge 115+, Safari 26+)에서는 CSS 만으로도 되지만,
// React 컴포넌트는 아직 지원이 갈린 Firefox 를 포함해 항상 움직여야 하므로 스크롤 리스너로 재계산한다.
export default function TopBar({ thickness = 3, color = "#2f6df6" }: TopBarProps) {
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScale(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const vars: Vars = { "--thickness": `${thickness}px`, "--color": color };

  return (
    <div className={styles.track} style={vars} role="progressbar" aria-label="Reading progress"
         aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(scale * 100)}>
      <div className={styles.bar} style={{ transform: `scaleX(${scale})` }} />
    </div>
  );
}
