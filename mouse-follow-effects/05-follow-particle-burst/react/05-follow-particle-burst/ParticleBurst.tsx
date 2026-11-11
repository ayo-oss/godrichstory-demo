// ParticleBurst — vanilla 판(run/079/demo/05-follow-particle-burst/index.html) 의 React 포트.
// 캔버스 없이 span 파편을 pool 로 돌려 쓴다. 커서 이동 거리를 쌓아 26px마다 파편 하나를
// element.animate(WAAPI)로 터뜨린다 — 색 배열·모양·거리·시간은 vanilla 와 같은 값이다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ParticleBurst.module.scss";

export type ParticleBurstProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// 전역 DOM 타입에 기대지 않는다 — 포인터 이벤트에서 실제로 읽는 것만 적는다
type PtrEvt = { clientX: number; clientY: number };

const FIELD_LABEL = "커서를 흰 고리가 움직이고 그 뒤로 색색의 파편이 터지는 그림";
const HINT = "마우스를 빠르게 움직이면 파편이 더 많이 터집니다";
const POOL_SIZE = 8;
// 커서가 이동한 거리를 쌓아 두었다가 이만큼마다 파편 하나를 터뜨린다 — 속도에 비례한다
const SPAWN_EVERY = 26;
const COLORS = ["#ff9ebb", "#4cd4a6", "#b9a0ff", "#6ec8ff", "#ffd23f"];
// 파편 세 모양 — 점·고리·마름모. module.scss 의 로컬 클래스 이름과 짝이다
const SHAPES = [styles.pDot, styles.pRing, styles.pGem];

export default function ParticleBurst({
  duration = 2000,
  easing = "ease-out",
  color = "#fff7e6",
}: ParticleBurstProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement>;
  const cursorRef = useRef<HTMLSpanElement | null>(null);
  const poolRef = useRef<(HTMLSpanElement | null)[]>(new Array(POOL_SIZE).fill(null)) as Box<(HTMLSpanElement | null)[]>;
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function setPool(index: number) {
    return (el: HTMLSpanElement | null): void => {
      poolRef.current[index] = el;
    };
  }

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // 오래된 브라우저에서는 파편 없이 커서 고리만 움직이게 둔다 (animate 는 인스턴스 메서드다)
    const canAnimate = typeof document.body.animate === "function";

    let last: { x: number; y: number } | null = null;
    let travel = 0;
    let next = 0;

    function spawn(x: number, y: number, dx: number, dy: number): void {
      const element = poolRef.current[next];
      next = (next + 1) % poolRef.current.length;
      if (!element) return;
      element.className = styles.p + " " + SHAPES[(Math.random() * SHAPES.length) | 0];
      // 모양마다 --pc 를 색으로 쓴다 (점은 배경, 고리는 테두리, 마름모는 배경)
      element.style.setProperty("--pc", COLORS[(Math.random() * COLORS.length) | 0]);
      const ang = Math.atan2(dy, dx) + (Math.random() - 0.5) * 2.4;
      const dist = 34 + Math.random() * 46;
      const tx = x + Math.cos(ang) * dist;
      const ty = y + Math.sin(ang) * dist;
      element.animate(
        [
          { transform: "translate3d(" + (x - 5) + "px," + (y - 5) + "px,0) rotate(0deg) scale(1)", opacity: 1 },
          { transform: "translate3d(" + (tx - 5) + "px," + (ty - 5) + "px,0) rotate(200deg) scale(.15)", opacity: 0 },
        ],
        { duration: 620 + Math.random() * 320, easing: "cubic-bezier(.2,.8,.2,1)" }
      );
    }

    function place(cx: number, cy: number): void {
      const r = field.getBoundingClientRect();
      const x = cx - r.left;
      const y = cy - r.top;
      const cursor = cursorRef.current;
      if (cursor) cursor.style.transform = "translate3d(" + (x - 8) + "px," + (y - 8) + "px,0)";
      if (last) {
        const dx = x - last.x;
        const dy = y - last.y;
        travel += Math.sqrt(dx * dx + dy * dy);
        while (travel > SPAWN_EVERY) {
          travel -= SPAWN_EVERY;
          if (!reduce && canAnimate) {
            spawn(x, y, dx, dy);
          }
        }
      }
      last = { x: x, y: y };
    }

    function onMove(event: PtrEvt): void {
      setDemo(false);
      place(event.clientX, event.clientY);
    }
    function onDown(event: PtrEvt): void {
      setDemo(false);
      last = null;
      place(event.clientX, event.clientY);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root + (demo ? " " + styles.isDemo : "")} style={vars}>
        <div className={styles.field} ref={fieldRef} role="img" aria-label={FIELD_LABEL}>
          <span className={styles.cursor} aria-hidden="true" ref={cursorRef}></span>
          <span className={styles.p + " " + styles.pDot} aria-hidden="true" ref={setPool(0)}></span>
          <span className={styles.p + " " + styles.pRing} aria-hidden="true" ref={setPool(1)}></span>
          <span className={styles.p + " " + styles.pDot} aria-hidden="true" ref={setPool(2)}></span>
          <span className={styles.p + " " + styles.pGem} aria-hidden="true" ref={setPool(3)}></span>
          <span className={styles.p + " " + styles.pDot} aria-hidden="true" ref={setPool(4)}></span>
          <span className={styles.p + " " + styles.pRing} aria-hidden="true" ref={setPool(5)}></span>
          <span className={styles.p + " " + styles.pGem} aria-hidden="true" ref={setPool(6)}></span>
          <span className={styles.p + " " + styles.pDot} aria-hidden="true" ref={setPool(7)}></span>
        </div>
        <p className={styles.hint}>{HINT}</p>
      </div>
    </main>
  );
}
