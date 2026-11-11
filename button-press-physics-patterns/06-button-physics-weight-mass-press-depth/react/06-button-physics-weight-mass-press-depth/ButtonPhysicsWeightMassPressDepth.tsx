import { useEffect, useRef } from "react";
import styles from "./ButtonPhysicsWeightMassPressDepth.module.scss";

export type ButtonPhysicsWeightMassPressDepthProps = {
  color?: string;
};

type MassKey = "light" | "medium" | "heavy";
type MassItem = { el: HTMLButtonElement; mass: number; depth: number; vel: number; target: number };

export default function ButtonPhysicsWeightMassPressDepth({
  color = "#0a4fe8",
}: ButtonPhysicsWeightMassPressDepthProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const lightEl = root.querySelector<HTMLButtonElement>(`.${styles.light}`);
    const mediumEl = root.querySelector<HTMLButtonElement>(`.${styles.medium}`);
    const heavyEl = root.querySelector<HTMLButtonElement>(`.${styles.heavy}`);
    if (!lightEl || !mediumEl || !heavyEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 계산 겹: 세 버튼은 같은 스프링 상수 K·감쇠 C 를 쓰지만 질량 값(MASS)이 다르다.
    // accel = -(K/MASS)*(depth-target) - (C/MASS)*vel — MASS 가 클수록 같은 힘에서 가속도가
    // 작아져(뉴턴 F=ma) 눌리고 돌아오는 속도가 함께 느려진다.
    const K = 320, C = 8, PRESS_DEPTH = 12;
    const MASS: Record<MassKey, number> = { light: 0.5, medium: 1.4, heavy: 3.6 };

    function makeBtn(el: HTMLButtonElement, key: MassKey): MassItem {
      return { el, mass: MASS[key], depth: 0, vel: 0, target: 0 };
    }
    const items: MassItem[] = [
      makeBtn(lightEl, "light"),
      makeBtn(mediumEl, "medium"),
      makeBtn(heavyEl, "heavy"),
    ];
    let last = 0, raf: number | null = null;

    function paint(it: MassItem) { it.el.style.transform = "translateY(" + it.depth.toFixed(2) + "px)"; }
    function tick(now: number) {
      const dt = Math.min((now - last) / 1000, 0.032);
      last = now;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const accel = (-K * (it.depth - it.target) - C * it.vel) / it.mass;
        it.vel += accel * dt;
        it.depth += it.vel * dt;
        paint(it);
      }
      raf = requestAnimationFrame(tick);
    }
    function start() { if (raf === null) { last = performance.now(); raf = requestAnimationFrame(tick); } }
    function press(it: MassItem, p: number) {
      if (reduce) { it.depth = p; it.vel = 0; it.target = p; paint(it); return; }
      it.target = p;
      start();
    }

    const cleanups: Array<() => void> = [];
    items.forEach((it) => {
      const onDown = () => { stopAutoplay(); press(it, PRESS_DEPTH); };
      const onUp = () => { press(it, 0); };
      it.el.addEventListener("pointerdown", onDown);
      it.el.addEventListener("pointerup", onUp);
      it.el.addEventListener("pointercancel", onUp);
      cleanups.push(() => {
        it.el.removeEventListener("pointerdown", onDown);
        it.el.removeEventListener("pointerup", onUp);
        it.el.removeEventListener("pointercancel", onUp);
      });
    });
    items.forEach(paint);

    let autoTimer: number | null = null, autoDown: number | null = null;
    function autoTick() {
      items.forEach((it) => { press(it, PRESS_DEPTH); });
      autoDown = window.setTimeout(() => { items.forEach((it) => { press(it, 0); }); }, 300);
    }
    function stopAutoplay() {
      if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; }
      if (autoDown !== null) { window.clearTimeout(autoDown); autoDown = null; }
    }
    if (!reduce) { autoTick(); autoTimer = window.setInterval(autoTick, 1700); }

    return () => {
      stopAutoplay();
      if (raf !== null) cancelAnimationFrame(raf);
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.bwm}>
        <div className={styles.row}>
          <button className={`${styles.btn} ${styles.light}`} type="button" style={{ background: color }}>가벼움</button>
          <button className={`${styles.btn} ${styles.medium}`} type="button" style={{ background: color }}>보통</button>
          <button className={`${styles.btn} ${styles.heavy}`} type="button" style={{ background: color }}>무거움</button>
        </div>
        <p className={styles.hint}>눌러보면 정해둔 질량 값이 클수록 더 느리게 움직입니다</p>
      </div>
    </div>
  );
}
