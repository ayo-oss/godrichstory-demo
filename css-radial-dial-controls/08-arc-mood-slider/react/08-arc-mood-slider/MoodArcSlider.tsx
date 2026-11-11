// MoodArcSlider — vanilla 판(run/374/demo/08-arc-mood-slider/index.html) 의 React 포트.
// 계산 겹: 포인터 좌표를 atan2 로 반원 각도로 바꾼 뒤(angleToT) 0~1 진행률로 정규화하고,
// 그 진행률을 hue 로 그대로 매핑해 색이 기분과 함께 바뀐다.
import { useEffect, useRef, useState } from "react";
import styles from "./MoodArcSlider.module.scss";

type Box<T> = { current: T };

const MOODS = ["우울", "지침", "보통", "좋음", "최고"];
const N = MOODS.length;
const LOOP_MS = 2000;

export default function MoodArcSlider() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const arcRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const handleRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const rafRef = useRef(0) as unknown as Box<number>;
  const [label, setLabel] = useState(MOODS[2]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current;
    const arc = arcRef.current;
    const handle = handleRef.current;
    if (!root || !arc || !handle) return;

    let isDemo = true;
    let dragging = false;
    let t = 0.5;

    function human() { if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; } }

    function angleToT(clientX: number, clientY: number) {
      const r = arc!.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.bottom;
      const deg = (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
      const clamped = Math.min(0, Math.max(-180, deg));
      return 1 - (clamped + 180) / 180;
    }

    function apply() {
      const deg = -180 + t * 180;
      const x = Math.cos((deg * Math.PI) / 180);
      const y = Math.sin((deg * Math.PI) / 180);
      handle!.style.setProperty("--x", x.toFixed(4));
      handle!.style.setProperty("--y", y.toFixed(4));
      handle!.style.setProperty("--hue", String(Math.round(t * 130)));
      const idx = Math.min(N - 1, Math.floor(t * N));
      setLabel(MOODS[idx]);
    }

    function onDown(e: PointerEvent) {
      human();
      dragging = true;
      handle!.setPointerCapture(e.pointerId);
      t = angleToT(e.clientX, e.clientY);
      apply();
    }
    function onMove(e: PointerEvent) { if (!dragging) return; t = angleToT(e.clientX, e.clientY); apply(); }
    function onUp() { dragging = false; }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowUp") { human(); t = Math.min(1, t + 1 / (N - 1)); apply(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") { human(); t = Math.max(0, t - 1 / (N - 1)); apply(); }
    }
    handle.addEventListener("pointerdown", onDown);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("keydown", onKeydown);

    function loop(ts: number) {
      if (isDemo) {
        if (!reduce) {
          const phase = (ts % LOOP_MS) / LOOP_MS;
          t = phase < 0.5 ? phase * 2 : 2 - phase * 2;
        } else {
          t = 0.5;
        }
        apply();
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    apply();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      handle.removeEventListener("pointerdown", onDown);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("keydown", onKeydown);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ms + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.arc} ref={arcRef}>
          <button className={styles.handle} ref={handleRef} type="button" aria-label="반원을 따라 드래그해서 기분 고르기" />
        </div>
        <p className={styles.label}>{label}</p>
      </div>
    </main>
  );
}
