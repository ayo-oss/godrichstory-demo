import { useEffect, useRef } from "react";
import styles from "./WidthExpandInline.module.scss";

type Box<T> = { current: T };

const REST_W = 104; // 접힘 너비(px) — getBoundingClientRect 로 실측해 갱신한다
const K = 170, D = 12; // 스프링 상수·감쇠 — 목표를 넘었다가 되돌아오는 관성 값

export default function WidthExpandInline() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLButtonElement | null;
    const more = root.querySelector(`.${styles.more}`) as HTMLElement | null;
    if (!btn || !more) return;

    // 계산 겹: 목표 폭을 getBoundingClientRect 로 실측한다(짐작 px 아님).
    function measure() {
      const prev = more!.style.width;
      more!.style.width = "auto";
      const w = more!.getBoundingClientRect().width;
      more!.style.width = prev || "0px";
      return Math.ceil(w);
    }
    const openW = measure() + REST_W + 24; // 24 = 기준 너비에 더할 여유

    let open = false;
    let cur = REST_W, vel = 0, target = REST_W;
    let raf: number | null = null;

    function tick() {
      const a = -K * (cur - target) * 0.001 - D * vel * 0.01;
      vel += a;
      cur += vel;
      if (Math.abs(cur - target) < 0.4 && Math.abs(vel) < 0.05) { cur = target; vel = 0; }
      btn!.style.width = cur.toFixed(1) + "px";
      const p = Math.max(0, Math.min(1, (cur - REST_W) / (openW - REST_W)));
      more!.style.opacity = String(p);
      raf = requestAnimationFrame(tick);
    }

    function toggle() {
      open = !open;
      target = open ? openW : REST_W;
      btn!.setAttribute("aria-expanded", String(open));
    }

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      toggle();
    }
    btn.addEventListener("click", onClick);

    raf = requestAnimationFrame(tick);

    let autoTimer: number | null = null;
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(toggle, 1300); }
    else {
      open = true; target = openW; cur = openW;
      btn!.style.width = openW + "px"; more!.style.opacity = "1";
    }

    return () => {
      stopAutoplay();
      if (raf !== null) cancelAnimationFrame(raf);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.we} ${styles["is-demo"]}`}>
      <p className={styles.line}>본문 한 줄이 흐르는 자리에 있습니다. 아래 단추가 그 줄을 흐리지 않게 절제되게 늘어납니다.</p>
      <button type="button" className={styles.btn} aria-expanded="false">
        <span className={styles.base}>더 보기</span>
        <span className={styles.more}>전문 값 보기</span>
      </button>
    </div>
  );
}
