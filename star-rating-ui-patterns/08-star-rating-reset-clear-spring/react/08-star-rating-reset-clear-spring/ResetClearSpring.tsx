import { useEffect, useRef } from "react";
import styles from "./ResetClearSpring.module.scss";

const STAR_PATH =
  "M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 19.771l-7.416 3.642 1.48-8.279-6.064-5.828 8.332-1.151z";

export default function ResetClearSpring() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const stars = Array.prototype.slice.call(
      root.querySelectorAll(`.${styles.star}`)
    ) as HTMLElement[];
    let value = 4;

    function paint(v: number) {
      stars.forEach((s, idx) => {
        const starVal = Math.max(0, Math.min(1, v - idx));
        s.querySelector<HTMLElement>(`.${styles.fillclip}`)!.style.width = (starVal * 100).toFixed(1) + "%";
      });
    }

    // 계산 겹: 초기화가 일어나면 채움 값을 0으로 보내는 동시에, 이미 채워졌던 별에만
    // 스프링 이징(퇴장 전 오버슛)이 걸린 팝 애니메이션 클래스를 씌운다.
    function reset() {
      const wasFilled = stars.filter((_s, idx) => idx < value);
      value = 0;
      paint(value);
      wasFilled.forEach((s) => s.classList.add(styles.bounce));
      window.setTimeout(() => {
        wasFilled.forEach((s) => s.classList.remove(styles.bounce));
      }, 620);
    }

    const clickHandlers: Array<() => void> = [];
    stars.forEach((s, idx) => {
      const i = idx + 1;
      const handler = () => {
        stopAutoplay();
        if (i === value) reset(); else { value = i; paint(value); }
      };
      clickHandlers.push(handler);
      s.addEventListener("click", handler);
    });

    paint(value);

    // 자동 루프: 값을 채운 뒤 같은 별을 다시 누른 상태를 흉내내 스프링 초기화를 반복해 보여준다.
    let phase = 0;
    let autoTimer: number | null = null;
    function autoTick() {
      if (phase === 0) { value = 4; paint(value); }
      else if (phase === 1) { reset(); }
      phase = (phase + 1) % 3;
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 700); autoTick(); }

    return () => {
      stopAutoplay();
      stars.forEach((s, idx) => s.removeEventListener("click", clickHandlers[idx]));
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.sr}>
        <div className={styles.row}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" className={styles.star}>
              <svg className={styles.base} viewBox="0 0 24 24"><path d={STAR_PATH} /></svg>
              <span className={styles.fillclip}>
                <svg className={styles.fill} viewBox="0 0 24 24"><path d={STAR_PATH} /></svg>
              </span>
            </button>
          ))}
        </div>
        <div className={styles.readout}>같은 별 다시 클릭 → 초기화</div>
      </div>
    </div>
  );
}
