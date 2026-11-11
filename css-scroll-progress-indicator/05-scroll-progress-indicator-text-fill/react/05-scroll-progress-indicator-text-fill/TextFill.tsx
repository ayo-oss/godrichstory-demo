import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./TextFill.module.scss";

export type TextFillProps = {
  children: ReactNode;
  /** 읽은 구간 색 */
  color?: string;
  /** 안 읽은 구간 색 */
  dim?: string;
};

type Vars = CSSProperties & { "--p"?: string; "--color"?: string; "--dim"?: string };

// 실제 쓰임: 헤드라인 색이 스크롤 진행률만큼 왼쪽부터 채워진다.
export default function TextFill({ children, color = "#2f6df6", dim = "rgba(255,255,255,.32)" }: TextFillProps) {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setPercent(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const vars: Vars = { "--p": `${percent}%`, "--color": color, "--dim": dim };

  return <h2 className={styles.headline} style={vars}>{children}</h2>;
}
