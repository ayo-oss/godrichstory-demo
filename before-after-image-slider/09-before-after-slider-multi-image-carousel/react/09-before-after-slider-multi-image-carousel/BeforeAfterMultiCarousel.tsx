import { useRef, useState, useEffect, useCallback } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./BeforeAfterMultiCarousel.module.scss";

export type BeforeAfterMultiCarouselProps = {
  duration?: string;
  easing?: string;
  color?: string;
  pairs?: number;
};

type Vars = CSSProperties & { "--reveal"?: string };

/** 전후 슬라이더 여러 쌍을 scroll-snap 캐러셀에 나란히 두고, IntersectionObserver 로 화면 중앙에 온 것만 드래그를 켠다. */
export default function BeforeAfterMultiCarousel({
  duration = "2s",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
  pairs = 3,
}: BeforeAfterMultiCarouselProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const paneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [reveals, setReveals] = useState<number[]>(() => Array(pairs).fill(50));
  const [demoIdx, setDemoIdx] = useState<Set<number>>(() => new Set(Array.from({ length: pairs }, (_, i) => i)));
  const [activeIdx, setActiveIdx] = useState(0);
  const dragging = useRef<number | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.intersectionRatio > 0.6) {
            const i = (paneRefs.current || []).indexOf(en.target as HTMLDivElement);
            if (i >= 0) setActiveIdx(i);
          }
        });
      },
      { root: track, threshold: [0.6] }
    );
    (paneRefs.current || []).forEach((p) => p && io.observe(p));
    return () => io.disconnect();
  }, [pairs]);

  const setFromX = useCallback((i: number, x: number) => {
    const el = (paneRefs.current || [])[i];
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100));
    setReveals((arr) => arr.map((v, idx) => (idx === i ? pct : v)));
  }, []);

  const onDown = useCallback((i: number) => (e: PointerEvent<HTMLDivElement>) => {
    if (activeIdx !== i) return;
    setDemoIdx((s) => { const n = new Set(s); n.delete(i); return n; });
    dragging.current = i;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setFromX(i, e.clientX);
  }, [activeIdx, setFromX]);
  const onMove = useCallback((i: number) => (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current === i) setFromX(i, e.clientX);
  }, [setFromX]);
  const onUp = useCallback(() => { dragging.current = null; }, []);

  return (
    <div className={styles.track} ref={trackRef}>
      {reveals.map((reveal, i) => {
        const vars: Vars = { "--reveal": `${reveal}%`, ["--duration" as string]: duration, ["--easing" as string]: easing, ["--color" as string]: color };
        const isDemo = demoIdx.has(i);
        const isActive = activeIdx === i;
        const cls = [styles.ba, isDemo ? styles.isDemo : "", isActive ? styles.isActive : ""].filter(Boolean).join(" ");
        return (
          <div
            key={i}
            ref={(el: HTMLDivElement | null) => { if (paneRefs.current) paneRefs.current[i] = el; }}
            className={cls}
            style={vars}
            onPointerDown={onDown(i)}
            onPointerMove={onMove(i)}
            onPointerUp={onUp}
          >
            <div className={styles.after} />
            <div className={styles.before} />
          </div>
        );
      })}
    </div>
  );
}
