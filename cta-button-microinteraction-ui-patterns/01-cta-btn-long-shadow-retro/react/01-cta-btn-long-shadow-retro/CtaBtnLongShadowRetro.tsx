import { useEffect, useRef } from "react";
import styles from "./CtaBtnLongShadowRetro.module.scss";

export type CtaBtnLongShadowRetroProps = {
  color?: string;
};

export default function CtaBtnLongShadowRetro({
  color = "#0a4fe8",
}: CtaBtnLongShadowRetroProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector<HTMLButtonElement>(`.${styles.btn}`);
    if (!btn) return;

    // 계산 겹: 그림자 길이 값을 매 프레임 목표로 선형 보간(0.28)해 부드럽게 좇고,
    // 그 길이만큼 45도 방향(dx=dy=1px)으로 레이어를 쌓아 box-shadow 문자열을 만든다.
    const MAXLEN = 22;
    const C_NEAR: [number, number, number] = [47, 109, 246];
    const C_FAR: [number, number, number] = [23, 20, 26];
    let len = 0;
    let target = 0;
    let raf: number | null = null;

    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

    function buildShadow(l: number) {
      const n = Math.round(l);
      if (n <= 0) return "none";
      const parts: string[] = [];
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const r = Math.round(lerp(C_NEAR[0], C_FAR[0], t));
        const g = Math.round(lerp(C_NEAR[1], C_FAR[1], t));
        const b = Math.round(lerp(C_NEAR[2], C_FAR[2], t));
        parts.push(i + "px " + i + "px 0 rgb(" + r + "," + g + "," + b + ")");
      }
      return parts.join(",");
    }

    function step() {
      const diff = target - len;
      len += diff * 0.28;
      if (Math.abs(diff) < 0.05) { len = target; }
      btn!.style.boxShadow = buildShadow(len);
      if (Math.abs(target - len) > 0.05) {
        raf = requestAnimationFrame(step);
      } else {
        raf = null;
      }
    }
    function go(to: number) {
      target = to;
      if (raf === null) { raf = requestAnimationFrame(step); }
    }

    function onEnter() { stopAutoplay(); go(MAXLEN); }
    function onLeave() { go(0); }
    btn.addEventListener("mouseenter", onEnter);
    btn.addEventListener("mouseleave", onLeave);
    btn.addEventListener("focus", onEnter);
    btn.addEventListener("blur", onLeave);

    let hovered = false;
    let autoplayTimer: number | null = null;
    function autoplayTick() { hovered = !hovered; go(hovered ? MAXLEN : 0); }
    function stopAutoplay() { if (autoplayTimer !== null) { window.clearInterval(autoplayTimer); autoplayTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoplayTimer = window.setInterval(autoplayTick, 700); }
    btn.style.boxShadow = "none";

    return () => {
      stopAutoplay();
      if (raf !== null) { cancelAnimationFrame(raf); }
      btn.removeEventListener("mouseenter", onEnter);
      btn.removeEventListener("mouseleave", onLeave);
      btn.removeEventListener("focus", onEnter);
      btn.removeEventListener("blur", onLeave);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.panel}>
        <button className={styles.btn} type="button" style={{ background: color }}>
          지금 시작하기
        </button>
        <span className={styles.hint}>호버하면 그림자 길이가 늘어납니다</span>
      </div>
    </div>
  );
}
