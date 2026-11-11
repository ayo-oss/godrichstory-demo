import { useEffect, useRef } from "react";
import styles from "./FocusTilt3d.module.scss";

type Box<T> = { current: T };

const MAX_DEG = 14;
const LERP = 0.14; // 계산 겹: 목표 기울기 값으로 매 프레임 이 비율만큼만 다가가는 관성 보간

export default function FocusTilt3d() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const pad = root.querySelector(`.${styles.pad}`) as HTMLElement | null;
    const card = root.querySelector(`.${styles.card}`) as HTMLElement | null;
    const sheen = root.querySelector(`.${styles.sheen}`) as HTMLElement | null;
    if (!pad || !card || !sheen) return;

    let targetX = 0, targetY = 0, curX = 0, curY = 0;
    let raf: number | null = null;

    function apply() {
      curX += (targetX - curX) * LERP;
      curY += (targetY - curY) * LERP;
      card!.style.transform = "perspective(600px) rotateX(" + curX.toFixed(2) + "deg) rotateY(" + curY.toFixed(2) + "deg)";
      sheen!.style.transform = "translate(" + (curY * 1.4).toFixed(1) + "px," + (curX * -1.4).toFixed(1) + "px)";
      raf = requestAnimationFrame(apply);
    }
    raf = requestAnimationFrame(apply);

    function setTargetFromPoint(px: number, py: number) {
      const r = pad!.getBoundingClientRect();
      const nx = (px - r.left) / r.width - 0.5;
      const ny = (py - r.top) / r.height - 0.5;
      targetY = nx * MAX_DEG * 2;
      targetX = -ny * MAX_DEG * 2;
    }

    function onPointerMove(e: PointerEvent) {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      setTargetFromPoint(e.clientX, e.clientY);
    }
    function onPointerLeave() {
      if (autoTimer === null) { targetX = 0; targetY = 0; }
    }
    pad.addEventListener("pointermove", onPointerMove);
    pad.addEventListener("pointerleave", onPointerLeave);

    // 자동 루프: 포인터 좌표 값이 원을 그리며 도는 것을 흉내낸다.
    let t = 0;
    let autoTimer: number | null = null;
    function autoTick() {
      const r = pad!.getBoundingClientRect();
      t += 0.12;
      const cx = r.left + r.width / 2 + Math.cos(t) * r.width * 0.32;
      const cy = r.top + r.height / 2 + Math.sin(t * 1.3) * r.height * 0.32;
      setTargetFromPoint(cx, cy);
    }
    function stopAutoplay() {
      if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; }
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 60); }

    return () => {
      stopAutoplay();
      if (raf !== null) cancelAnimationFrame(raf);
      pad.removeEventListener("pointermove", onPointerMove);
      pad.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.ct} ${styles["is-demo"]}`}>
      <div className={styles.pad}>
        <div className={styles.card}>
          <span className={styles.chip} />
          <span className={styles.num}>9999 9999 9999 9995</span>
          <span className={styles.sheen} />
        </div>
      </div>
    </div>
  );
}
