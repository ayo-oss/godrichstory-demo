import { useCallback, useRef } from "react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import styles from "./MouseParallax.module.scss";

export type MouseParallaxProps = {
  children: ReactNode;
  /** 커서 정규화값 1당 이동량 (기본 22px) */
  amp?: number;
  /** 레이어 색 */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--amp"?: string; "--color"?: string; "--mx"?: string; "--my"?: string };

export default function MouseParallax({ children, amp = 22, color = "#2f6df6", className = "" }: MouseParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handle = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    ref.current?.style.setProperty("--mx", `${(e.clientX - r.left) / r.width - 0.5}`);
    ref.current?.style.setProperty("--my", `${(e.clientY - r.top) / r.height - 0.5}`);
  }, []);

  const vars: Vars = { "--amp": `${amp}px`, "--color": color };

  return (
    <div ref={ref} className={`${styles.wrap} ${className}`} style={vars} onPointerMove={handle}>
      <div className={styles.layer} style={{ "--depth": ".3", left: "18%", top: "24%" } as Vars} aria-hidden="true" />
      <div className={styles.layer} style={{ "--depth": ".6", left: "62%", top: "54%" } as Vars} aria-hidden="true" />
      <div className={styles.layer} style={{ "--depth": "1", left: "40%", top: "68%" } as Vars} aria-hidden="true" />
      <p className={styles.label}>{children}</p>
    </div>
  );
}
