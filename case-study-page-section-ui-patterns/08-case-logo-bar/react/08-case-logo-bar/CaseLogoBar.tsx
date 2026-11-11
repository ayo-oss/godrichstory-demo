// CaseLogoBar — vanilla 판(run/340/demo/08-case-logo-bar/index.html) 의 React 포트.
// 로고 개수가 바뀌어도 체감 속도(초당 픽셀)가 같도록, 실제 렌더 폭을 재서 한 바퀴 시간을
// 매번 계산한다. 트랙을 통째로 2벌 두고 -50% 만큼 옮기는 무한 루프라 flex gap 대신
// margin-right 로 간격을 준다(BD15).
import { useEffect, useRef, useState } from "react";
import styles from "./CaseLogoBar.module.scss";

export type CaseLogoBarProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "로고 개수가 바뀌어도 흐르는 속도(초당 픽셀)는 같도록, 실제 렌더 폭을 재서 한 바퀴 시간을 매번 계산합니다";

const LOGOS = ["NOVA", "ATLAS", "COBALT", "SILVERLINE", "TERRA", "PRISM"];

const LOOP_SEC = 15; // 변형: 15 → 30 (기준 폭에서의 한 바퀴 시간)
const BASE_WIDTH = 560; // 기준 렌더 폭(px) — 이 폭일 때 LOOP_SEC 이 그대로 적용된다
const MIN_SEC = 8;
const MAX_SEC = 40;

export default function CaseLogoBar({
  duration = "2s",
  easing = "linear",
  color = "#17141a"
}: CaseLogoBarProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [speedNote, setSpeedNote] = useState("계산된 한 바퀴 0.0초");

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function recompute(): void {
      if (!track) return;
      const setA = track.querySelectorAll<HTMLElement>('[data-set="a"]');
      let halfWidth = 0;
      setA.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        halfWidth += rect.width + parseFloat(style.marginRight || "0");
      });
      let dur = LOOP_SEC * (halfWidth / BASE_WIDTH);
      dur = Math.max(MIN_SEC, Math.min(MAX_SEC, dur));
      track.style.setProperty("--marquee-duration", dur.toFixed(2) + "s");
      const pxPerSec = halfWidth / dur;
      setSpeedNote(
        "로고 " + setA.length + "개 · 계산된 한 바퀴 " + dur.toFixed(1) + "초 · 초당 " + Math.round(pxPerSec) + "px"
      );
    }

    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.panel}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.marqueeWrap}>
          <div className={styles.marqueeTrack} ref={trackRef}>
            {LOGOS.map((name) => (
              <span key={"a-" + name} className={styles.logo} data-set="a">
                {name}
              </span>
            ))}
            {LOGOS.map((name) => (
              <span key={"b-" + name} className={styles.logo} data-set="b" aria-hidden="true">
                {name}
              </span>
            ))}
          </div>
        </div>
        <p className={styles.speedNote}>{speedNote}</p>
      </section>
    </main>
  );
}
