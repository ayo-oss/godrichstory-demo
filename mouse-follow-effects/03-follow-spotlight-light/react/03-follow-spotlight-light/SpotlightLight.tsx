// SpotlightLight — vanilla 판(run/079/demo/03-follow-spotlight-light/index.html) 의 React 포트.
// radial-gradient 빛 덩어리가 mix-blend-mode: screen 으로 어두운 무대를 덮으며 커서를 lerp(0.09)로 늦게 쫓는다.
// screen 은 밝은 쪽만 더 밝게 하므로 지나온 글자와 별이 드러난다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SpotlightLight.module.scss";

export type SpotlightLightProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// 전역 DOM 타입에 기대지 않는다 — 포인터 이벤트에서 실제로 읽는 것만 적는다
type PtrEvt = { clientX: number; clientY: number };

const SCENE_LABEL = "어두운 무대를 빛 덩어리가 늦게 따라다니며 글자와 별을 밝히는 그림";
const WORD = "빛이 따라온다";
const HINT = "마우스를 움직이면 빛이 한 박자 늦게 따라옵니다";
// 별 여섯 개의 자리 — vanilla index.html 의 인라인 스타일과 같은 값
const STARS: { left: string; top: string }[] = [
  { left: "8%", top: "18%" },
  { left: "16%", top: "64%" },
  { left: "83%", top: "22%" },
  { left: "90%", top: "66%" },
  { left: "70%", top: "80%" },
  { left: "28%", top: "84%" },
];

// lerp: 매 프레임 남은 거리의 일부만 더 가는 선형 보간
function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

export default function SpotlightLight({
  duration = 2000,
  easing = "ease-out",
  color = "#fff7e6",
}: SpotlightLightProps) {
  const sceneRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement>;
  const lightRef = useRef<HTMLSpanElement | null>(null);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };

    function setTarget(cx: number, cy: number): void {
      const r = scene.getBoundingClientRect();
      target.x = cx - r.left;
      target.y = cy - r.top;
    }

    function draw(): void {
      const light = lightRef.current;
      // 빛 덩어리는 자기 중심이 좌표에 오도록 절반만큼 뺀다
      if (light) light.style.transform = "translate3d(" + (pos.x - 110) + "px," + (pos.y - 110) + "px,0)";
    }

    function tick(): void {
      pos.x = lerp(pos.x, target.x, 0.09);
      pos.y = lerp(pos.y, target.y, 0.09);
      draw();
      raf = requestAnimationFrame(tick);
    }

    function start(): void {
      const r = scene.getBoundingClientRect();
      target.x = r.width / 2;
      target.y = r.height / 2;
      pos.x = r.width / 2;
      pos.y = r.height / 2;
    }

    function onMove(event: PtrEvt): void {
      setDemo(false);
      setTarget(event.clientX, event.clientY);
      if (reduce) {
        // reduce 에서는 빛이 한가운데에 머문다
        pos.x = target.x;
        pos.y = target.y;
        draw();
      }
    }
    function onDown(event: PtrEvt): void {
      setDemo(false);
      setTarget(event.clientX, event.clientY);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);

    let raf = 0;
    start();
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
          <p className={styles.word}>{WORD}</p>
          {STARS.map((star, i) => (
            <span className={styles.star} style={{ left: star.left, top: star.top }} aria-hidden="true" key={i}></span>
          ))}
          <span className={styles.light} ref={lightRef} aria-hidden="true"></span>
        </div>
        <p className={styles.hint}>{HINT}</p>
      </div>
    </main>
  );
}
