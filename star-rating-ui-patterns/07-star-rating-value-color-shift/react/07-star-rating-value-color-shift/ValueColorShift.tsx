import { useEffect, useRef } from "react";
import styles from "./ValueColorShift.module.scss";

const STAR_PATH =
  "M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 19.771l-7.416 3.642 1.48-8.279-6.064-5.828 8.332-1.151z";

export default function ValueColorShift() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const stars = Array.prototype.slice.call(
      root.querySelectorAll(`.${styles.star}`)
    ) as HTMLElement[];
    const numEl = root.querySelector<HTMLElement>(`.${styles.num}`);
    const readout = root.querySelector<HTMLElement>(`.${styles.readout}`);
    if (!numEl || !readout) return;

    // 토큰 사이 보간 — demo-tokens 의 $error(낮은 값)와 $subject-mint(높은 값) hex 를 그대로 두 끝점으로 쓴다.
    const LOW = [0xc2, 0x36, 0x1a];
    const HIGH = [0x4c, 0xd4, 0xa6];

    // 계산 겹: 선택된 값(1~5)을 0~1 비율 t 로 바꾼 뒤, 두 토큰 색의 R·G·B 채널을 각각
    // t 만큼 선형보간(mix)해 중간 색을 만든다 — HSL 회전이 아니라 채널별 산술 혼합이다.
    function mix(t: number) {
      const c = LOW.map((v, i) => Math.round(v + (HIGH[i] - v) * t));
      return "rgb(" + c.join(",") + ")";
    }

    function paint(value: number) {
      const t = (value - 1) / 4;
      const color = mix(t);
      stars.forEach((s, idx) => {
        s.style.color = idx < value ? color : "";
        s.classList.toggle(styles.filled, idx < value);
      });
      numEl!.textContent = String(value);
      readout!.style.color = color;
    }

    const clickHandlers: Array<() => void> = [];
    stars.forEach((s, idx) => {
      const i = idx + 1;
      const handler = () => { stopAutoplay(); paint(i); };
      clickHandlers.push(handler);
      s.addEventListener("click", handler);
    });

    paint(3);

    // 자동 루프: 값을 1→5→1 로 오가며 두 토큰 색 사이를 잇는 보간 색을 보여준다.
    const seq = [1, 2, 3, 4, 5, 4, 3, 2];
    let si = 0;
    let autoTimer: number | null = null;
    function autoTick() { paint(seq[si]); si = (si + 1) % seq.length; }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 340); autoTick(); }

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
              <svg viewBox="0 0 24 24"><path d={STAR_PATH} /></svg>
            </button>
          ))}
        </div>
        <div className={styles.readout}>값 <b className={styles.num}>3</b></div>
      </div>
    </div>
  );
}
