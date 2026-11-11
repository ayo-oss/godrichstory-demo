// OutlineFillMorphBookmark — vanilla 판(run/416/demo/02-bookmark-btn-outline-fill-morph/index.html) 의 React 포트.
// 값 하나: fill 진행률(0~1, 관성 lerp) → SVG rect 의 y/height(clip-path 로 리본 모양 안에서만 차오른다) + 배경 패널 강도.
import { useEffect, useRef, useState } from "react";
import styles from "./OutlineFillMorphBookmark.module.scss";

type Box<T> = { current: T };

const CYCLE_S = 2;
const LERP_RATE = 0.22;

export default function OutlineFillMorphBookmark() {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<SVGRectElement | null>(null);
  const progressRef = useRef<number>(0) as Box<number>;
  const targetRef = useRef<number>(0) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [saved, setSaved] = useState(false);
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(p: number): void {
    const fill = fillRef.current;
    const panel = panelRef.current;
    if (!fill || !panel) return;
    const y = 24 * (1 - p);
    fill.setAttribute("y", y.toFixed(3));
    fill.setAttribute("height", (24 - y).toFixed(3));
    panel.style.setProperty("--fill-p", p.toFixed(3));
  }

  function toggle(v: boolean): void {
    setSaved(v);
    targetRef.current = v ? 1 : 0;
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    let start = 0;
    let prevT = 0;
    let toggledA = false;
    let toggledB = false;
    function loop(now: number): void {
      if (start === 0) start = now;
      const t = ((now - start) / 1000) % CYCLE_S;
      if (t < prevT) { toggledA = false; toggledB = false; }
      prevT = t;
      if (!reduce && demo) {
        if (!toggledA && t > 0.3) { toggledA = true; toggle(true); }
        if (!toggledB && t > 1.3) { toggledB = true; toggle(false); }
      }
      if (reduce) {
        progressRef.current = targetRef.current;
      } else {
        progressRef.current += (targetRef.current - progressRef.current) * LERP_RATE;
      }
      render(progressRef.current);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce, demo]);

  function onClick(): void {
    setDemo(false);
    toggle(!saved);
  }

  return (
    <main className={styles.stage}>
      <div className={styles.ob}>
        <p className={styles.caption}>윤곽선에서 채움으로 바뀌는 북마크 버튼</p>
        <div className={styles.scene}>
          <div className={styles.panel} aria-hidden="true" ref={panelRef} />
          <button className={styles.btn} type="button" aria-pressed={saved} onClick={onClick}>
            <svg className={styles.icon} viewBox="0 0 24 24" width={34} height={34} aria-hidden="true" focusable="false">
              <defs>
                <clipPath id="obClip">
                  <path d="M6.5 3A1.5 1.5 0 0 1 8 1.5h8A1.5 1.5 0 0 1 17.5 3v18.2a.9.9 0 0 1-1.38.76L12 19.1l-4.12 2.86A.9.9 0 0 1 6.5 21.2Z" />
                </clipPath>
              </defs>
              <path className={styles.outline} d="M6.5 3A1.5 1.5 0 0 1 8 1.5h8A1.5 1.5 0 0 1 17.5 3v18.2a.9.9 0 0 1-1.38.76L12 19.1l-4.12 2.86A.9.9 0 0 1 6.5 21.2Z" />
              <rect className={styles.fill} ref={fillRef} x={0} y={24} width={24} height={24} clipPath="url(#obClip)" />
            </svg>
          </button>
        </div>
        <p className={styles.status} aria-live="polite">{saved ? "저장됨" : "저장 전"}</p>
      </div>
    </main>
  );
}
