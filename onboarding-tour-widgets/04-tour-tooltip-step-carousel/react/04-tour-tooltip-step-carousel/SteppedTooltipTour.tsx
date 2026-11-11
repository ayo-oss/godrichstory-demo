import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SteppedTooltipTour.module.scss";

const CaretLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">
    <path d="M160,48V208L80,128Z" opacity="0.2" />
    <path d="M163.06,40.61a8,8,0,0,0-8.72,1.73l-80,80a8,8,0,0,0,0,11.32l80,80A8,8,0,0,0,168,208V48A8,8,0,0,0,163.06,40.61ZM152,188.69,91.31,128,152,67.31Z" />
  </svg>
);
const CaretRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">
    <path d="M176,128,96,208V48Z" opacity="0.2" />
    <path d="M181.66,122.34l-80-80A8,8,0,0,0,88,48V208a8,8,0,0,0,13.66,5.66l80-80A8,8,0,0,0,181.66,122.34ZM104,188.69V67.31L164.69,128Z" />
  </svg>
);

export type SteppedTooltipTourProps = {
  duration?: number;
  easing?: string;
  color?: string;
  steps?: string[];
  /** 0 이면 자동 진행 없음 */
  autoPlayMs?: number;
};

export default function SteppedTooltipTour({
  duration = 420,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
  steps = ["Create a project first", "Invite your teammates", "Hit your first deploy"],
  autoPlayMs = 1400,
}: SteppedTooltipTourProps) {
  // 마지막 뒤에 1번 슬라이드를 한 장 더 붙인다. 끝에서 처음으로 갈 때
  // 뒤로 되감지 않고 같은 방향으로 한 칸 더 가면 되고, 그림이 같으니 이음매가 안 보인다
  const slides = steps.concat(steps.length > 0 ? [steps[0]] : []);
  const clone = steps.length;

  const [i, setI] = useState(0);
  const [anim, setAnim] = useState(true);

  const next = () => { setAnim(true); setI((v) => (v >= clone ? v : v + 1)); };
  const prev = () => {
    // 0 에서 뒤로 가면 먼저 복제 슬라이드로 순간 이동한다 (그림이 같아 티가 안 난다)
    if (i === 0) { setAnim(false); setI(clone); } else { setAnim(true); setI((v) => v - 1); }
  };

  // 전환 없이 자리만 옮긴 다음 프레임에 다시 전환을 켠다
  useEffect(() => {
    if (anim) return;
    const id = requestAnimationFrame(() => {
      setAnim(true);
      if (i === clone) setI(clone - 1);
    });
    return () => cancelAnimationFrame(id);
  }, [anim, i, clone]);

  useEffect(() => {
    if (!autoPlayMs) return;
    const id = setTimeout(next, autoPlayMs);
    return () => clearTimeout(id);
  }, [i, autoPlayMs]);

  // 복제 슬라이드에 도착했으면 전환을 끄고 진짜 0번으로 돌려놓는다
  const onEnd = () => { if (i === clone) { setAnim(false); setI(0); } };

  const vars: CSSProperties = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--count": slides.length,
  } as CSSProperties;

  const track: CSSProperties = {
    width: `${slides.length * 100}%`,
    transform: `translateX(-${(100 / slides.length) * i}%)`,
    transition: anim ? `transform ${duration}ms ${easing}` : "none",
  };

  return (
    <div className={styles.tour} style={vars}>
      <div className={styles.view}>
        <div className={styles.track} style={track} onTransitionEnd={onEnd}>
          {slides.map((text, n) => (
            <div className={styles.slide} key={n} style={{ width: `${100 / slides.length}%`, flex: `0 0 ${100 / slides.length}%` }}>
              <b>{(n % steps.length) + 1} / {steps.length}</b>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.nav}>
        <button type="button" className={styles.nb} onClick={prev} aria-label="Previous step"><CaretLeft /></button>
        <button type="button" className={`${styles.nb} ${styles.go}`} onClick={next} aria-label="Next step"><CaretRight /></button>
      </div>
    </div>
  );
}
