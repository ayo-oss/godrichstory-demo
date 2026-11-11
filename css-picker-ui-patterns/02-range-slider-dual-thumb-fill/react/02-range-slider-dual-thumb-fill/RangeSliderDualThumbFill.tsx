import { useState, useRef, useCallback } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./RangeSliderDualThumbFill.module.scss";

export type RangeSliderDualThumbFillProps = {
  min?: number;
  max?: number;
  gap?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--c"?: string };

export default function RangeSliderDualThumbFill({
  min = 20, max = 70, gap = 5,
  duration = 220, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#4cd4a6",
}: RangeSliderDualThumbFillProps) {
  const [lo, setLo] = useState(min);
  const [hi, setHi] = useState(max);
  const trackRef = useRef<HTMLDivElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--c": color };

  const pctFromX = useCallback((x: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.round(Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100)));
  }, []);

  function drag(which: "lo" | "hi") {
    return (e: PointerEvent<HTMLButtonElement>) => {
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
      function move(ev: any) {
        const p = pctFromX(ev.clientX);
        if (which === "lo") setLo((prev) => Math.min(p, hi - gap));
        else setHi((prev) => Math.max(p, lo + gap));
      }
      function up() {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      }
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
  }

  function key(which: "lo" | "hi") {
    return (e: any) => {
      const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key as string];
      if (step === undefined) return;
      e.preventDefault();
      if (which === "lo") setLo(Math.max(0, Math.min(lo + step, hi - gap)));
      else setHi(Math.min(100, Math.max(hi + step, lo + gap)));
    };
  }

  return (
    <div className={styles.rng} style={vars}>
      <div className={styles.track} ref={trackRef}>
        <div className={styles.fill} style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
        <button type="button" className={styles.thumb} style={{ left: `${lo}%` }} role="slider"
          aria-label="Minimum price" aria-valuemin={0} aria-valuemax={100} aria-valuenow={lo}
          onPointerDown={drag("lo")} onKeyDown={key("lo")} />
        <button type="button" className={styles.thumb} style={{ left: `${hi}%` }} role="slider"
          aria-label="Maximum price" aria-valuemin={0} aria-valuemax={100} aria-valuenow={hi}
          onPointerDown={drag("hi")} onKeyDown={key("hi")} />
      </div>
      <div className={styles.labels}>{Math.round(lo / 10)}0K KRW – {Math.round(hi / 10)}0K KRW</div>
    </div>
  );
}
