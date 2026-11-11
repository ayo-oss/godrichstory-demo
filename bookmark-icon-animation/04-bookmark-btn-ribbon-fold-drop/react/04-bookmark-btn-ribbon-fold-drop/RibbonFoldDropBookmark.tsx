// RibbonFoldDropBookmark — vanilla 판(run/416/demo/04-bookmark-btn-ribbon-fold-drop/index.html) 의 React 포트.
// 값 하나: 접힘 진행률(사인 곡선 한 번의 봉우리) → 접힘 각도(rotateX) + 낙하 거리 + 그림자 블러·농도 + 배경 톤.
import { useEffect, useRef, useState } from "react";
import styles from "./RibbonFoldDropBookmark.module.scss";

type Box<T> = { current: T };

const FOLD_MAX_DEG = 56;
const FOLD_DROP_MAX_PX = 12;
const FOLD_MS = 560;
const CYCLE_S = 2;

export default function RibbonFoldDropBookmark() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const foldStartRef = useRef<number | null>(null);
  const pendingRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [saved, setSaved] = useState(false);
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(p: number): void {
    const scene = sceneRef.current;
    const wrap = wrapRef.current;
    const shadow = shadowRef.current;
    if (!scene || !wrap || !shadow) return;
    scene.style.setProperty("--tone", p.toFixed(3));
    const deg = p * FOLD_MAX_DEG;
    const drop = p * FOLD_DROP_MAX_PX;
    wrap.style.transform = "perspective(300px) rotateX(" + deg.toFixed(2) + "deg) translateY(" + drop.toFixed(2) + "px)";
    const blur = 3 + p * 10;
    const spread = 6 - p * 4;
    const alpha = 0.22 + p * 0.28;
    shadow.style.boxShadow = "0 " + (2 + p * 6).toFixed(1) + "px " + blur.toFixed(1) + "px " + spread.toFixed(1) + "px rgba(23,20,26," + alpha.toFixed(2) + ")";
    shadow.style.transform = "scaleX(" + (1 - p * 0.18).toFixed(3) + ")";
  }

  function triggerFold(): void {
    pendingRef.current = true;
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
      if (pendingRef.current) { foldStartRef.current = now; pendingRef.current = false; }
      const t = ((now - start) / 1000) % CYCLE_S;
      if (t < prevT) { toggledA = false; toggledB = false; }
      prevT = t;
      if (!reduce && demo) {
        if (!toggledA && t > 0.35) { toggledA = true; setSaved(true); triggerFold(); }
        if (!toggledB && t > 1.35) { toggledB = true; setSaved(false); triggerFold(); }
      }
      let p = 0;
      if (!reduce && foldStartRef.current !== null) {
        const ft = (now - foldStartRef.current) / FOLD_MS;
        if (ft >= 1) {
          foldStartRef.current = null;
          p = 0;
        } else {
          p = Math.sin(Math.PI * ft);
        }
      }
      render(p);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce, demo]);

  function onClick(): void {
    setDemo(false);
    setSaved(!saved);
    triggerFold();
  }

  return (
    <main className={styles.stage}>
      <div className={styles.fd}>
        <p className={styles.caption}>리본이 접히며 떨어지는 북마크 버튼</p>
        <div className={styles.scene} ref={sceneRef}>
          <div className={styles.shadow} ref={shadowRef} aria-hidden="true" />
          <button className={styles.btn} type="button" aria-pressed={saved} onClick={onClick}>
            <span className={styles.wrap} ref={wrapRef}>
              <svg className={styles.icon} viewBox="0 0 24 24" width={30} height={30} aria-hidden="true" focusable="false">
                <path className={styles.shape} d="M6.5 3A1.5 1.5 0 0 1 8 1.5h8A1.5 1.5 0 0 1 17.5 3v18.2a.9.9 0 0 1-1.38.76L12 19.1l-4.12 2.86A.9.9 0 0 1 6.5 21.2Z" />
              </svg>
            </span>
          </button>
        </div>
        <p className={styles.status} aria-live="polite">{saved ? "저장됨" : "저장 전"}</p>
      </div>
    </main>
  );
}
