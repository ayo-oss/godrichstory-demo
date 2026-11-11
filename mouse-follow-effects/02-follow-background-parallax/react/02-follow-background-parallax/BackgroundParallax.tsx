// BackgroundParallax — vanilla 판(run/079/demo/02-follow-background-parallax/index.html) 의 React 포트.
// 커서 가로 위치(--px, 0~1)를 lerp(0.08)로 부드럽게 만들어 멀리 언덕은 -10px · 가까운 언덕은 -22px ·
// 풀은 -34px 씩 밀어 서로 다른 속도로 따라오게 한다. 풀잎 skewX 는 --px 하나를 공유해 커서 쪽으로 눕고
// 해의 눈동자도 같은 값으로 커서를 본다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BackgroundParallax.module.scss";

export type BackgroundParallaxProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// 전역 DOM 타입에 기대지 않는다 — 포인터 이벤트에서 실제로 읽는 것만 적는다
type PtrEvt = { clientX: number };

const SCENE_LABEL = "언덕과 풀 위에 해가 뜨고 해의 눈이 커서를 바라보는 그림";
const HINT = "마우스를 움직이면 배경과 풀이 따라옵니다";
const BLADE_COUNT = 9;

// lerp: 매 프레임 남은 거리의 일부만 더 가는 선형 보간
function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

export default function BackgroundParallax({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: BackgroundParallaxProps) {
  const sceneRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement>;
  const farRef = useRef<HTMLDivElement | null>(null);
  const midRef = useRef<HTMLDivElement | null>(null);
  const grassRef = useRef<HTMLDivElement | null>(null);
  const pupilRef = useRef<(HTMLSpanElement | null)[]>(new Array(2).fill(null)) as Box<(HTMLSpanElement | null)[]>;
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function setPupil(index: number) {
    return (el: HTMLSpanElement | null): void => {
      pupilRef.current[index] = el;
    };
  }

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // --px 는 0~1 사이 커서 가로 위치. 풀잎 skewX 가 이 값 하나를 공유해 같이 눕는다
    let px = 0.5;
    let pxNow = 0.5;

    function tick(): void {
      pxNow = lerp(pxNow, px, 0.08);
      scene.style.setProperty("--px", pxNow.toFixed(4));
      const dx = pxNow - 0.5;
      // 멀수록 조금, 가까울수록 많이 밀린다 — 시차
      const far = farRef.current;
      const mid = midRef.current;
      const grass = grassRef.current;
      if (far) far.style.transform = "translate3d(" + (dx * -10).toFixed(1) + "px,0,0)";
      if (mid) mid.style.transform = "translate3d(" + (dx * -22).toFixed(1) + "px,0,0)";
      if (grass) grass.style.transform = "translate3d(" + (dx * -34).toFixed(1) + "px,0,0)";
      for (let i = 0; i < pupilRef.current.length; i++) {
        const pupil = pupilRef.current[i];
        if (pupil) pupil.style.transform = "translate3d(" + (dx * 7).toFixed(1) + "px,0,0)";
      }
      raf = requestAnimationFrame(tick);
    }

    function setFromPointer(cx: number): void {
      const r = scene.getBoundingClientRect();
      px = Math.min(1, Math.max(0, (cx - r.left) / r.width));
    }

    function onMove(event: PtrEvt): void {
      setDemo(false);
      setFromPointer(event.clientX);
      if (reduce) {
        // reduce 에서는 시차 이동 없이 풀잎 눕음만 즉시 값으로 반영한다
        scene.style.setProperty("--px", px.toFixed(4));
      }
    }
    function onDown(event: PtrEvt): void {
      setDemo(false);
      setFromPointer(event.clientX);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);

    let raf = 0;
    if (!reduce) raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root + (demo ? " " + styles.isDemo : "")} style={vars}>
        <div className={styles.scene} ref={sceneRef} role="img" aria-label={SCENE_LABEL}>
          <div className={styles.sky} aria-hidden="true"></div>
          <div className={styles.sun} aria-hidden="true">
            <span className={styles.eye}><span className={styles.pupil} ref={setPupil(0)}></span></span>
            <span className={styles.eye}><span className={styles.pupil} ref={setPupil(1)}></span></span>
            <span className={styles.mouth}></span>
          </div>
          <div className={styles.hill + " " + styles.hillFar} ref={farRef} aria-hidden="true"></div>
          <div className={styles.hill + " " + styles.hillMid} ref={midRef} aria-hidden="true"></div>
          <div className={styles.grass} ref={grassRef} aria-hidden="true">
            {Array.from({ length: BLADE_COUNT }, (_, i) => (
              <span className={styles.blade} key={i}></span>
            ))}
          </div>
        </div>
        <p className={styles.hint}>{HINT}</p>
      </div>
    </main>
  );
}
