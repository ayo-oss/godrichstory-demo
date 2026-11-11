import { useRef, useState, useCallback } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./BeforeAfterKeyboardA11y.module.scss";

export type BeforeAfterKeyboardA11yProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--reveal"?: string };
type KeyEvent = { key: string; preventDefault: () => void; [k: string]: any };

/** role="slider" + 방향키 5%·Home·End 로 마우스 없이도 조작한다. aria-valuenow 가 실시간으로 갱신된다. */
export default function BeforeAfterKeyboardA11y({
  duration = "2s",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: BeforeAfterKeyboardA11yProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [reveal, setReveal] = useState(50);
  const [demo, setDemo] = useState(true);
  const dragging = useRef(false);

  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  const setFromX = useCallback((x: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setReveal(clamp(((x - r.left) / r.width) * 100));
  }, []);

  const onDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    setDemo(false);
    dragging.current = true;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setFromX(e.clientX);
  }, [setFromX]);
  const onMove = useCallback((e: PointerEvent<HTMLDivElement>) => { if (dragging.current) setFromX(e.clientX); }, [setFromX]);
  const onUp = useCallback(() => { dragging.current = false; }, []);

  const onKeyDown = useCallback((e: KeyEvent) => {
    setDemo(false);
    if (e.key === "ArrowLeft") { setReveal((v) => clamp(v - 5)); e.preventDefault(); }
    else if (e.key === "ArrowRight") { setReveal((v) => clamp(v + 5)); e.preventDefault(); }
    else if (e.key === "Home") { setReveal(0); e.preventDefault(); }
    else if (e.key === "End") { setReveal(100); e.preventDefault(); }
  }, []);

  const vars: Vars = { "--reveal": `${reveal}%`, ["--duration" as string]: duration, ["--easing" as string]: easing, ["--color" as string]: color };

  return (
    <div
      ref={ref}
      className={demo ? `${styles.ba} ${styles.isDemo}` : styles.ba}
      style={vars}
      role="slider"
      tabIndex={0}
      aria-label="이전/이후 비교 슬라이더"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(reveal)}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onKeyDown={onKeyDown}
    >
      <div className={styles.after} />
      <div className={styles.before} />
      <div className={styles.handle}>
        <span className={styles.grip} />
      </div>
    </div>
  );
}
