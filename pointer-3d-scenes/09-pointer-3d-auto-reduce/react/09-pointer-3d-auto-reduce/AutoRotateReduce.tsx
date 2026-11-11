// AutoRotateReduce — vanilla 판(run/290/demo/09-pointer-3d-auto-reduce/index.html) 의 React 포트.
// 포인터가 있는 기기(hover: hover and pointer: fine)면 사람이 마우스를 따라 돌리고, 없으면 CSS 애니메이션이 스스로 돈다.
// 사람이 돌리는 동안에는 자동 회전 클래스(prismAuto)를 떼고 inline transform 을 직접 쓴다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AutoRotateReduce.module.scss";

export type AutoRotateReduceProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// 전역 DOM 타입에 기대지 않는다 — 포인터·키보드 이벤트에서 실제로 읽는 것만 적는다
type PtrEvt = { clientX: number };
type KeyEvt = { key: string; preventDefault(): void };

const AUTO_LABEL = "포인터 없음 · 스스로 회전";
const HAND_LABEL = "마우스를 따라 회전";
const SCENE_LABEL = "포인터가 없으면 스스로 도는 상자, 움직임 최소화 설정에서는 멈춘다";

export default function AutoRotateReduce({
  duration = 2000,
  easing = "linear",
  color = "#fff7e6",
}: AutoRotateReduceProps) {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const prismRef = useRef<HTMLDivElement | null>(null);
  const keyDegRef = useRef<number>(0) as Box<number>;
  const [demo, setDemo] = useState(true);
  const [auto, setAuto] = useState(true);
  const [label, setLabel] = useState(AUTO_LABEL);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 사람이 잡은 순간: 자동 회전 클래스를 떼고 각도를 직접 쓴다
  function handOver(deg: number): void {
    const prism = prismRef.current;
    if (!prism) return;
    setDemo(false);
    setAuto(false);
    prism.style.transform = "rotateX(-10deg) rotateY(" + deg.toFixed(1) + "deg)";
    setLabel(HAND_LABEL);
  }

  // 손을 놓은 순간: inline transform 을 지우고 자동 회전 클래스를 다시 붙인다 (is-demo 는 그대로 둔다 — vanilla 와 같다)
  function backToAuto(): void {
    const prism = prismRef.current;
    if (!prism) return;
    prism.style.transform = "";
    setAuto(true);
    setLabel(AUTO_LABEL);
  }

  // 포인터가 아예 없는 기기인지 먼저 묻는다 — 있으면 사람이 돌리고, 없으면 스스로 돈다
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sceneBox = sceneRef.current as Box<HTMLDivElement> | null;
    if (!fine.matches || !sceneBox) return;
    const scene = sceneBox.current;
    function onMove(event: PtrEvt): void {
      const r = scene.getBoundingClientRect();
      handOver(Math.max(-1, Math.min(1, ((event.clientX - r.left) / r.width) * 2 - 1)) * 42);
    }
    function onLeave(): void {
      backToAuto();
    }
    scene.addEventListener("pointermove", onMove);
    scene.addEventListener("pointerleave", onLeave);
    return () => {
      scene.removeEventListener("pointermove", onMove);
      scene.removeEventListener("pointerleave", onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 키보드 경로: 좌우 화살표가 12도씩 돌리고, Escape 가 자동 회전으로 돌려놓는다
  function onKeyDown(event: KeyEvt): void {
    if (event.key === "Escape") {
      backToAuto();
      return;
    }
    const turn = event.key === "ArrowLeft" ? -12 : event.key === "ArrowRight" ? 12 : 0;
    if (!turn) return;
    event.preventDefault();
    keyDegRef.current = Math.max(-42, Math.min(42, keyDegRef.current + turn));
    handOver(keyDegRef.current);
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const prismCls = [styles.prism, auto ? styles.prismAuto : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div
          className={styles.scene}
          ref={sceneRef}
          role="img"
          aria-label={SCENE_LABEL}
          tabIndex={0}
          onKeyDown={onKeyDown}
        >
          <div className={prismCls} ref={prismRef}>
            <span className={`${styles.side} ${styles.sideA}`}></span>
            <span className={`${styles.side} ${styles.sideB}`}></span>
            <span className={`${styles.side} ${styles.sideC}`}></span>
            <span className={`${styles.side} ${styles.sideD}`}></span>
          </div>
        </div>
        <p className={styles.state}>
          {demo ? (
            <>
              <span>{AUTO_LABEL}</span>
              <span className={styles.modeHand}>{HAND_LABEL}</span>
            </>
          ) : (
            label
          )}
        </p>
      </div>
    </main>
  );
}
