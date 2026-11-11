import { useEffect, useRef } from "react";
import styles from "./KeyboardArrowSelect.module.scss";

const STAR_PATH =
  "M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 19.771l-7.416 3.642 1.48-8.279-6.064-5.828 8.332-1.151z";

export default function KeyboardArrowSelect() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const row = root.querySelector<HTMLDivElement>(`.${styles.row}`);
    const numEl = root.querySelector<HTMLElement>(`.${styles.num}`);
    if (!row || !numEl) return;
    const clips = Array.prototype.slice.call(
      row.querySelectorAll(`.${styles.fillclip}`)
    ) as HTMLElement[];
    const TOTAL = clips.length;
    let target = 3;
    let display = 3;
    let raf: number | null = null;

    function paint(v: number) {
      clips.forEach((el, idx) => {
        const starVal = Math.max(0, Math.min(1, v - idx));
        el.style.width = (starVal * 100).toFixed(1) + "%";
      });
    }

    // 계산 겹: 매 프레임 display 값을 target 값 쪽으로 20% 씩만 이동시키는 선형보간(lerp) —
    // 방향키를 눌러도 값이 즉시 튀지 않고 관성 있는 곡선으로 따라간다.
    function tick() {
      display += (target - display) * 0.2;
      if (Math.abs(target - display) < 0.01) {
        display = target;
        paint(display);
        raf = null;
        return;
      }
      paint(display);
      raf = requestAnimationFrame(tick);
    }
    function animateTo(t: number) {
      target = Math.max(0, Math.min(TOTAL, t));
      row!.setAttribute("aria-valuenow", String(target));
      numEl!.textContent = String(target);
      if (raf === null) raf = requestAnimationFrame(tick);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") { e.preventDefault(); stopAutoplay(); animateTo(target + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); stopAutoplay(); animateTo(target - 1); }
    }
    row.addEventListener("keydown", onKeyDown);

    paint(display);

    // 자동 루프: 방향키 입력을 흉내내 값을 0→5→0 으로 오가며 lerp 이동을 보여준다.
    const seq = [4, 5, 3, 1, 0, 2, 3];
    let seqI = 0;
    let autoTimer: number | null = null;
    function autoTick() { animateTo(seq[seqI]); seqI = (seqI + 1) % seq.length; }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 620); autoTick(); }

    return () => {
      stopAutoplay();
      if (raf !== null) cancelAnimationFrame(raf);
      row.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.sr}>
        <div
          className={styles.row}
          role="slider"
          tabIndex={0}
          aria-label="별점"
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={3}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={styles.star}>
              <svg className={styles.base} viewBox="0 0 24 24"><path d={STAR_PATH} /></svg>
              <span className={styles.fillclip}>
                <svg className={styles.fill} viewBox="0 0 24 24"><path d={STAR_PATH} /></svg>
              </span>
            </span>
          ))}
        </div>
        <div className={styles.readout}>
          <span className={styles.hint}>← → 방향키</span> · <b className={styles.num}>3</b> / 5
        </div>
      </div>
    </div>
  );
}
