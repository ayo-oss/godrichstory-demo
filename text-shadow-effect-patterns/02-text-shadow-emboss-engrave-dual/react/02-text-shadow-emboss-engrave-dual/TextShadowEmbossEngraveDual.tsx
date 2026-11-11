// TextShadowEmbossEngraveDual — vanilla 판(run/412/demo/02-text-shadow-emboss-engrave-dual/index.html) 의 React 포트.
// 각도 값(angleDeg) 하나로 밝은 그림자와 어두운 그림자를 서로 반대 방향에 배치한다.
// 각도가 돌면 빛이 도는 것처럼 도드라짐과 파임이 자리를 바꾼다.
import { useEffect, useRef, useState } from "react";
import styles from "./TextShadowEmbossEngraveDual.module.scss";

type Box<T> = { current: T };

const EMBOSS_DEPTH_PX = 12.5;
const PERIOD_MS = 1000;

function buildEmbossShadow(angleDeg: number): string {
  const rad = (angleDeg * Math.PI) / 180;
  const lx = (Math.cos(rad) * EMBOSS_DEPTH_PX).toFixed(2);
  const ly = (Math.sin(rad) * EMBOSS_DEPTH_PX).toFixed(2);
  const dx = (-Math.cos(rad) * EMBOSS_DEPTH_PX).toFixed(2);
  const dy = (-Math.sin(rad) * EMBOSS_DEPTH_PX).toFixed(2);
  return [
    lx + "px " + ly + "px 0 rgba(255,255,255,.85)",
    dx + "px " + dy + "px 1px rgba(10,10,14,.75)"
  ].join(", ");
}

export default function TextShadowEmbossEngraveDual() {
  const wordRef = useRef<HTMLHeadingElement | null>(null);
  const valueRef = useRef<HTMLSpanElement | null>(null);
  const t0Ref = useRef<number>(0) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [demo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function render(angleDeg: number): void {
    const word = wordRef.current;
    const value = valueRef.current;
    if (!word || !value) return;
    word.style.textShadow = buildEmbossShadow(angleDeg);
    value.textContent = Math.round(angleDeg % 360) + "deg";
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduce) {
      render(45);
      return;
    }
    function loop(now: number): void {
      if (t0Ref.current === 0) t0Ref.current = now;
      const t = (now - t0Ref.current) % PERIOD_MS;
      const angle = (t / PERIOD_MS) * 360;
      render(angle);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce]);

  const cls = [styles.em, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls}>
        <p className={styles.badge}><span>빛 각도</span> <span ref={valueRef}>0deg</span></p>
        <h1 className={styles.word} ref={wordRef}>요철</h1>
      </div>
    </main>
  );
}
