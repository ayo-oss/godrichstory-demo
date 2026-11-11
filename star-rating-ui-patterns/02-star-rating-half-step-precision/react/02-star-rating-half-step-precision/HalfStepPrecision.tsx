import { useEffect, useRef } from "react";
import styles from "./HalfStepPrecision.module.scss";

const STAR_PATH =
  "M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 19.771l-7.416 3.642 1.48-8.279-6.064-5.828 8.332-1.151z";

export default function HalfStepPrecision() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const row = root.querySelector<HTMLDivElement>(`.${styles.row}`);
    const numEl = root.querySelector<HTMLElement>(`.${styles.num}`);
    if (!row || !numEl) return;
    const stars = Array.prototype.slice.call(
      row.querySelectorAll(`.${styles.star}`)
    ) as HTMLElement[];
    const clips = stars.map((s) => s.querySelector<HTMLElement>(`.${styles.fillclip}`)!);
    let value = 0;

    // 계산 겹: 각 별의 실제 렌더 폭(getBoundingClientRect)을 기준으로 포인터가 왼쪽 절반에 있는지
    // 오른쪽 절반에 있는지를 나눠, 정수 또는 .5 단위로만 값을 스냅한다.
    function valueFromX(clientX: number) {
      for (let i = 0; i < stars.length; i++) {
        const r = stars[i].getBoundingClientRect();
        if (clientX < r.left) return i;
        if (clientX <= r.right) {
          const half = r.left + r.width / 2;
          return clientX < half ? i + 0.5 : i + 1;
        }
      }
      return stars.length;
    }

    function paint(v: number) {
      stars.forEach((_s, idx) => {
        const starVal = Math.max(0, Math.min(1, v - idx));
        clips[idx].style.width = (starVal * 100).toFixed(0) + "%";
      });
      numEl!.textContent = v.toFixed(1);
    }

    function setFromPointer(clientX: number) {
      value = valueFromX(clientX);
      paint(value);
    }

    function onMove(e: PointerEvent) {
      stopAutoplay();
      setFromPointer(e.clientX);
    }
    function onClick(e: MouseEvent) { setFromPointer(e.clientX); }
    row.addEventListener("pointermove", onMove);
    row.addEventListener("click", onClick);

    paint(value);

    // 자동 루프: 반 칸 단위(0.5)로 값을 끝까지 올렸다 처음으로 되돌리는 것을 반복한다.
    const steps = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
    let step = 0;
    let autoTimer: number | null = null;
    function autoTick() { paint(steps[step]); value = steps[step]; step = (step + 1) % steps.length; }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 260); autoTick(); }

    return () => {
      stopAutoplay();
      row.removeEventListener("pointermove", onMove);
      row.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.sr}>
        <div className={styles.row}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={styles.star}>
              <svg className={styles.base} viewBox="0 0 24 24"><path d={STAR_PATH} /></svg>
              <span className={styles.fillclip}>
                <svg className={styles.fill} viewBox="0 0 24 24"><path d={STAR_PATH} /></svg>
              </span>
            </span>
          ))}
        </div>
        <div className={styles.readout}><b className={styles.num}>0.0</b> / 5</div>
      </div>
    </div>
  );
}
