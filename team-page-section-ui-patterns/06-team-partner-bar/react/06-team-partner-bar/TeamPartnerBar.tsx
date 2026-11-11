// TeamPartnerBar — vanilla 판(run/338/demo/06-team-partner-bar/index.html) 의 React 포트.
// 한 세트의 실제 폭을 재서 원하는 속도(px/s)가 나오도록 애니메이션 지속시간을 거꾸로
// 계산한다(계산 한 겹).
import { useEffect, useRef } from "react";
import styles from "./TeamPartnerBar.module.scss";

export type TeamPartnerBarProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "한 세트의 실제 폭을 재서 원하는 속도(px/s)가 나오도록 애니메이션 지속시간을 거꾸로 계산합니다";

function mulberry32(a: number): () => number {
  return function (): number {
    a |= 0; a = a + 0x6d2b79f5 | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SHAPES = ["circle", "square", "triangle", "hexagon", "diamond", "pill"];
const COUNT = 6;
const SPEEDS = [60, 30];

const SHAPE_CLASS: { [k: string]: string } = {
  circle: styles.logoCircle,
  square: styles.logoSquare,
  triangle: styles.logoTriangle,
  hexagon: styles.logoHexagon,
  diamond: styles.logoDiamond,
  pill: styles.logoPill
};

function ShapeSet({ idPrefix }: { idPrefix: string }) {
  const items = Array.from({ length: COUNT }, (_, i) => i);
  return (
    <>
      {items.map((i) => {
        const shape = SHAPES[i % SHAPES.length];
        return (
          <span
            key={idPrefix + i}
            className={styles.logo + " " + SHAPE_CLASS[shape]}
            role="img"
            aria-label={"파트너 P" + (i + 1)}
          />
        );
      })}
    </>
  );
}

export default function TeamPartnerBar({
  duration = "2s",
  easing = "linear",
  color = "#17141a"
}: TeamPartnerBarProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const setARef = useRef<HTMLDivElement | null>(null);
  const chipRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    const setA = setARef.current;
    const chip = chipRef.current;
    if (!track || !setA || !chip) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const rnd = mulberry32(77);
    void rnd();

    function apply(speed: number): void {
      const setWidth = setA!.getBoundingClientRect().width;
      if (setWidth <= 0) return;
      const durationS = setWidth / speed;
      track!.style.setProperty("--dur", durationS + "s");
      chip!.textContent = "speed " + speed + "px/s · " + durationS.toFixed(1) + "s/lap";
    }

    let idx = 0;
    apply(SPEEDS[0]);
    const onResize = (): void => apply(SPEEDS[idx]);
    window.addEventListener("resize", onResize);

    let timer = 0;
    if (!reduce) {
      timer = window.setInterval(() => {
        idx = (idx + 1) % SPEEDS.length;
        apply(SPEEDS[idx]);
      }, 2400);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      if (timer) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.bar}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.viewport}>
          <div className={styles.track} ref={trackRef}>
            <div className={styles.set} ref={setARef}>
              <ShapeSet idPrefix="a" />
            </div>
            <div className={styles.set} aria-hidden="true">
              <ShapeSet idPrefix="b" />
            </div>
          </div>
        </div>
        <p className={styles.meta}>
          <span className={styles.chip} ref={chipRef} style={{ color }}>speed 60px/s</span>
        </p>
      </section>
    </main>
  );
}
