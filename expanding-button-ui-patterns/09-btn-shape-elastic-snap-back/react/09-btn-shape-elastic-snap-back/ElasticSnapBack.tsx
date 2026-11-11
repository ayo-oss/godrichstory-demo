import { useEffect, useRef } from "react";
import styles from "./ElasticSnapBack.module.scss";

type Box<T> = { current: T };

const K = 190, D = 14; // 계산 겹: 스프링 상수·감쇠 — 눌렀다 놓는 순간의 되튐 값을 정한다

export default function ElasticSnapBack() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLButtonElement | null;
    if (!btn) return;

    let collapsed = false;
    let cur = 1, vel = 0, target = 1;
    let raf: number | null = null;

    function tick() {
      const a = -K * (cur - target) * 0.001 - D * vel * 0.01;
      vel += a;
      cur += vel;
      if (Math.abs(cur - target) < 0.004 && Math.abs(vel) < 0.005) { cur = target; vel = 0; }
      btn!.style.transform = "scaleX(" + cur.toFixed(3) + ")";
      const p = Math.max(0, Math.min(1, (1 - cur) / 0.28));
      root!.style.setProperty("--press", p.toFixed(3));
      raf = requestAnimationFrame(tick);
    }

    function toggle() {
      collapsed = !collapsed;
      target = collapsed ? 0.72 : 1;
      btn!.setAttribute("aria-pressed", String(collapsed));
      root!.classList.toggle(styles["root--collapsed"], collapsed);
    }

    function onDown() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      target = Math.min(target, 0.86); // 누르는 순간 살짝 줄어든다
    }
    function onUp() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      toggle();
    }
    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      toggle();
    }
    btn.addEventListener("pointerdown", onDown);
    btn.addEventListener("pointerup", onUp);
    btn.addEventListener("click", onClick);

    raf = requestAnimationFrame(tick);

    let autoTimer: number | null = null;
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(toggle, 1200); }
    else {
      collapsed = true; target = 0.72; cur = 0.72;
      btn!.style.transform = "scaleX(0.72)";
      root!.classList.add(styles["root--collapsed"]);
      btn!.setAttribute("aria-pressed", "true");
    }

    return () => {
      stopAutoplay();
      if (raf !== null) cancelAnimationFrame(raf);
      btn.removeEventListener("pointerdown", onDown);
      btn.removeEventListener("pointerup", onUp);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.eb} ${styles["is-demo"]}`}>
      <button type="button" className={styles.btn} aria-pressed="false">
        <span className={styles.label}>필터 값 접기</span>
      </button>
      <div className={styles.chipRow} aria-hidden="true">
        <span className={styles.chip}>값 걸러내기 1</span>
        <span className={styles.chip}>값 걸러내기 2</span>
        <span className={styles.chip}>값 걸러내기 3</span>
      </div>
    </div>
  );
}
