// EyesFollow — vanilla 판(run/290/demo/04-pointer-3d-eyes-follow/index.html) 의 React 포트.
// 눈마다 자기 중심에서 커서까지의 각도를 재고, 그 방향으로 눈동자를 반지름의 22% 만큼 내보낸다.
// 포인터가 없어도 화살표 키가 같은 각도를 만들어 준다. 값·수치는 vanilla 와 같다.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./EyesFollow.module.scss";

export type EyesFollowProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// 키보드 이벤트는 ambient react 타입에 없다 — 쓰는 두 가지만 지역 타입으로 적는다
type KeyEvt = { key: string; preventDefault(): void };

const EYE_COUNT = 4;
const ROW_LABEL = "고양이와 로봇이 눈동자로 커서를 따라보는 그림";
const HINT = "마우스를 움직이면 눈이 따라옵니다";
// 화살표가 시선을 보내는 지점은 상자 밖 60px
const KEY_REACH = 60;

export default function EyesFollow({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: EyesFollowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const eyesRef = useRef<(HTMLSpanElement | null)[]>(new Array(EYE_COUNT).fill(null)) as Box<(HTMLSpanElement | null)[]>;
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 눈마다 자기 중심에서 커서까지의 각도를 재고, 그 방향으로 눈동자를 반지름만큼만 내보낸다
  const look = useCallback((clientX: number, clientY: number): void => {
    for (let i = 0; i < eyesRef.current.length; i++) {
      const eye = eyesRef.current[i];
      if (!eye) continue;
      const pupil = eye.firstElementChild as HTMLElement | null;
      if (!pupil) continue;
      const r = eye.getBoundingClientRect();
      const angle = Math.atan2(clientY - (r.top + r.height / 2), clientX - (r.left + r.width / 2));
      const reach = Math.min(r.width, r.height) * 0.22;
      pupil.style.transform =
        "translate(" + (Math.cos(angle) * reach).toFixed(1) + "px, " + (Math.sin(angle) * reach).toFixed(1) + "px)";
    }
  }, []);

  useEffect(() => {
    function onMove(event: PointerEvent): void {
      setDemo(false);
      look(event.clientX, event.clientY);
    }
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [look]);

  function setEye(index: number) {
    return (el: HTMLSpanElement | null): void => {
      eyesRef.current[index] = el;
    };
  }

  // 키보드 경로: 화살표로 시선을 네 방향으로 보낸다 (포인터가 없어도 같은 각도를 본다)
  function onKeyDown(event: KeyEvt): void {
    const row = rowRef.current;
    if (!row) return;
    const r = row.getBoundingClientRect();
    const spots: { [key: string]: [number, number] } = {
      ArrowLeft: [r.left - KEY_REACH, r.top + r.height / 2],
      ArrowRight: [r.right + KEY_REACH, r.top + r.height / 2],
      ArrowUp: [r.left + r.width / 2, r.top - KEY_REACH],
      ArrowDown: [r.left + r.width / 2, r.bottom + KEY_REACH],
    };
    const spot = spots[event.key];
    if (!spot) return;
    event.preventDefault();
    setDemo(false);
    look(spot[0], spot[1]);
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.row} ref={rowRef} role="img" aria-label={ROW_LABEL} tabIndex={0} onKeyDown={onKeyDown}>
          <div className={`${styles.face} ${styles.faceCat}`}>
            <span className={`${styles.ear} ${styles.earL}`} aria-hidden="true"></span>
            <span className={`${styles.ear} ${styles.earR}`} aria-hidden="true"></span>
            <span className={styles.eye} ref={setEye(0)}>
              <span className={styles.pupil}></span>
              <span className={styles.lid} aria-hidden="true"></span>
            </span>
            <span className={styles.eye} ref={setEye(1)}>
              <span className={styles.pupil}></span>
              <span className={styles.lid} aria-hidden="true"></span>
            </span>
            <span className={styles.mouth} aria-hidden="true"></span>
          </div>
          <div className={`${styles.face} ${styles.faceBot}`}>
            <span className={styles.ant} aria-hidden="true"></span>
            <span className={`${styles.eye} ${styles.eyeWide}`} ref={setEye(2)}>
              <span className={`${styles.pupil} ${styles.pupilBar}`}></span>
              <span className={styles.lid} aria-hidden="true"></span>
            </span>
            <span className={`${styles.eye} ${styles.eyeWide}`} ref={setEye(3)}>
              <span className={`${styles.pupil} ${styles.pupilBar}`}></span>
              <span className={styles.lid} aria-hidden="true"></span>
            </span>
            <span className={styles.grill} aria-hidden="true"></span>
          </div>
        </div>
        <p className={styles.hint}>{HINT}</p>
      </div>
    </main>
  );
}
