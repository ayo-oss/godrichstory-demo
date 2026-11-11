import { useCallback, useRef, type CSSProperties } from "react";
import styles from "./RingPulseButton.module.scss";

export type RingPulseButtonProps = {
  label: string;
  /** 링이 다 부풀고 사라지는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  /** 버튼·링 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function RingPulseButton({
  label,
  duration = 600,
  easing = "ease-out",
  color = "#0a4fe8",
}: RingPulseButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 클릭이 끝나도 링은 끝까지 재생돼야 해서 :active 만으로는 부족하다 (index.html 과 같은 이유)
  const onPointerDown = useCallback(() => {
    const b = ref.current;
    if (!b) return;
    b.classList.remove(styles.ringing);
    void b.offsetWidth;
    b.classList.add(styles.ringing);
  }, []);

  const onAnimationEnd = useCallback((e: { animationName: string }) => {
    if (e.animationName.includes("ring")) ref.current?.classList.remove(styles.ringing);
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      className={styles.btn}
      style={vars}
      onPointerDown={onPointerDown}
      onAnimationEnd={onAnimationEnd}
    >
      {label}
    </button>
  );
}
