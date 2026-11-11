import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SideRail.module.scss";

export type SideRailProps = {
  /** 레일 두께 (기본 4px) */
  thickness?: number;
  /** 채워진 구간 색 */
  color?: string;
};

type Vars = CSSProperties & { "--thickness"?: string; "--color"?: string };

// 실제 쓰임: TopBar 와 같은 계산을 세로(scaleY)로 그린다.
export default function SideRail({ thickness = 4, color = "#2f6df6" }: SideRailProps) {
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
    <div className={styles.rail} style={vars} role="progressbar" aria-label="Reading position"
         aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(scale * 100)}>
      <div className={styles.fill} style={{ transform: `scaleY(${scale})` }} />
    </div>
  );
}
