import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./MagneticButton.module.scss";

export type MagneticButtonProps = { children: ReactNode; radius?: number; strength?: number; duration?: number; onClick?: () => void };

export default function MagneticButton({ children, radius = 120, strength = 0.35, duration = 160, onClick }: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = Math.hypot(dx, dy) < radius ? `translate(${dx * strength}px, ${dy * strength}px)` : "";
    };
    document.addEventListener("pointermove", move);
    return () => document.removeEventListener("pointermove", move);
  }, [radius, strength]);
  const vars = { "--duration": `${duration}ms` } as CSSProperties;
  return (
    <button ref={ref} type="button" className={styles.btn} style={vars} onClick={onClick}>
      {children}
    </button>
  );
}
