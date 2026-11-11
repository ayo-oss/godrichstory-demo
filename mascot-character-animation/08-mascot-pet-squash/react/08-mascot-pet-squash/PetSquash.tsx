// PetSquash — vanilla 판(run/300/demo/08-mascot-pet-squash/index.html) 의 React 포트.
// 문지름은 pointerdown 으로 누르고 pointermove 의 가로 이동거리를 합산해 36px 마다 한 번, 하트 하나.
// 손을 뗄 때의 한 번 넘김(overshoot)은 CSS transition($ease-pop) 이 담당한다. 값은 vanilla 와 같다.
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PetSquash.module.scss";

export type PetSquashProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type HeartVars = CSSProperties & { "--i"?: string; "--x"?: string };
// ambient.d.ts 가 React 이벤트 제네릭을 주지 않으므로 파라미터는 로컬 타입으로 받는다(237 실측)
type PointerEvt = { clientX: number; pointerId: number; currentTarget: { setPointerCapture?: (id: number) => void } };
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };   // useRef<T> 는 T|null 을 돌려주므로 단언용(237·247 실측)
type Heart = { id: number; x: number };

const RUB_PX = 36;
const HINT_TEXT = "머리를 좌우로 문질러 쓰다듬어 보세요";
const PET_LABEL = "마스코트 쓰다듬기";
const ZERO_TEXT = "0번 쓰다듬었습니다";
const LABEL_TEXT = "{n}번 쓰다듬었습니다";

let heartSeq = 0;

export default function PetSquash({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: PetSquashProps) {
  const [count, setCount] = useState(0);
  const [demo, setDemo] = useState(true);
  const [pressed, setPressed] = useState(false);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const drag = useRef({ down: false, lastX: 0, acc: 0 }) as Box<{ down: boolean; lastX: number; acc: number }>;

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function rub() {
    setCount((c) => c + 1);
    const h: Heart = { id: ++heartSeq, x: 24 + Math.round(Math.random() * 52) };
    setHearts((prev) => prev.concat(h));
    window.setTimeout(() => setHearts((prev) => prev.filter((p) => p.id !== h.id)), 1500);
  }
  function onDown(e: PointerEvt) {
    setDemo(false);
    drag.current = { down: true, lastX: e.clientX, acc: 0 };
    setPressed(true);
    try {
      if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) { /* 캡처를 못 잡으면 버튼 안에서만 문지름을 센다 */ }
  }
  function onMove(e: PointerEvt) {
    if (!drag.current.down) return;
    drag.current.acc += Math.abs(e.clientX - drag.current.lastX);
    drag.current.lastX = e.clientX;
    if (drag.current.acc >= RUB_PX) { drag.current.acc = 0; rub(); }
  }
  function onUp() {
    if (!drag.current.down) return;
    drag.current.down = false;
    setPressed(false);
  }
  // 키보드 대체 — Enter·Space 로도 한 번 쓰다듬는다. 기본 click 과 겹치지 않게 preventDefault.
  function onKey(e: KeyEvt) {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    setDemo(false);
    rub();
    setPressed(true);
    window.setTimeout(() => setPressed(false), 380);
  }

  const cls = [styles.root, demo ? styles.isDemo : "", pressed ? styles.isPress : ""].filter(Boolean).join(" ");
  const tally = (count === 0 ? ZERO_TEXT : LABEL_TEXT).replace("{n}", String(count));

  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-heart" viewBox="0 0 256 256" fill="currentColor"><g><path d="M232 102c0 66-104 122-104 122S24 168 24 102a54 54 0 0 1 54-54c22.59 0 41.94 12.31 50 32c8.06-19.69 27.41-32 50-32a54 54 0 0 1 54 54" opacity=".2"/><path d="M178 40c-20.65 0-38.73 8.88-50 23.89C116.73 48.88 98.65 40 78 40a62.07 62.07 0 0 0-62 62c0 70 103.79 126.66 108.21 129a8 8 0 0 0 7.58 0C136.21 228.66 240 172 240 102a62.07 62.07 0 0 0-62-62m-50 174.8c-18.26-10.64-96-59.11-96-112.8a46.06 46.06 0 0 1 46-46c19.45 0 35.78 10.36 42.6 27a8 8 0 0 0 14.8 0c6.82-16.67 23.15-27 42.6-27a46.06 46.06 0 0 1 46 46c0 53.61-77.76 102.15-96 112.8"/></g></symbol>
          <symbol id="ico-hand" viewBox="0 0 256 256" fill="currentColor"><g><path d="M184 213.27A80 80 0 0 1 74.7 184l-40-69.32a20 20 0 0 1 34.64-20L55.08 70a20 20 0 0 1 34.65-20l6.92 12a20 20 0 0 1 34.64-20l30 52A20 20 0 0 1 196 74l17.31 30A80 80 0 0 1 184 213.27" opacity=".2"/><path d="m220.17 100l-17.31-30a28 28 0 0 0-38.24-10.25a27.7 27.7 0 0 0-9 8.34L138.2 38a28 28 0 0 0-48.48 0a28 28 0 0 0-41.57 36l1.59 2.76A27.7 27.7 0 0 0 38 80.41a28 28 0 0 0-10.24 38.25l40 69.32a87.47 87.47 0 0 0 53.43 41a88.6 88.6 0 0 0 22.92 3a88 88 0 0 0 76.06-132Zm-6.66 62.64A72 72 0 0 1 81.62 180l-40-69.32a12 12 0 0 1 20.78-12L81.63 132a8 8 0 1 0 13.85-8L62 66a12 12 0 1 1 20.78-12L114 108a8 8 0 1 0 13.85-8l-24.28-42a12 12 0 1 1 20.78-12l33.42 57.9a48 48 0 0 0-5.54 60.6a8 8 0 0 0 13.24-9a32 32 0 0 1 7.31-43.5a8 8 0 0 0 2.13-10.4L168.23 90A12 12 0 1 1 189 78l17.31 30a71.56 71.56 0 0 1 7.2 54.62ZM184.25 31.71A8 8 0 0 1 194 26a59.62 59.62 0 0 1 36.53 28l.33.57a8 8 0 1 1-13.85 8l-.33-.57a43.67 43.67 0 0 0-26.8-20.5a8 8 0 0 1-5.63-9.79M80.89 237a8 8 0 0 1-11.23 1.33A119.6 119.6 0 0 1 40.06 204a8 8 0 0 1 13.86-8a103.7 103.7 0 0 0 25.64 29.72A8 8 0 0 1 80.89 237"/></g></symbol>
        </defs>
      </svg>
      <div className={cls} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} aria-hidden="true"><use href="#ico-hand" /></svg>
          <span>{HINT_TEXT}</span>
        </p>
        <div className={styles.floor}>
          <button
            className={styles.char}
            type="button"
            aria-label={PET_LABEL}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onKeyDown={onKey}
          >
            <span className={styles.hearts} aria-hidden="true">
              {hearts.map((h) => (
                <i key={h.id} className={`${styles.heart} ${styles.heartOnce}`} style={{ "--x": `${h.x}%` } as HeartVars}>
                  <svg><use href="#ico-heart" /></svg>
                </i>
              ))}
              {demo && (
                <>
                  <i className={`${styles.heart} ${styles.heartLoop}`} style={{ "--i": "0", "--x": "30%" } as HeartVars}><svg><use href="#ico-heart" /></svg></i>
                  <i className={`${styles.heart} ${styles.heartLoop}`} style={{ "--i": "1", "--x": "48%" } as HeartVars}><svg><use href="#ico-heart" /></svg></i>
                  <i className={`${styles.heart} ${styles.heartLoop}`} style={{ "--i": "2", "--x": "66%" } as HeartVars}><svg><use href="#ico-heart" /></svg></i>
                </>
              )}
            </span>
            <span className={styles.body}>
              <i className={`${styles.eye} ${styles.eyeL}`} />
              <i className={`${styles.eye} ${styles.eyeR}`} />
              <i className={`${styles.cheek} ${styles.cheekL}`} />
              <i className={`${styles.cheek} ${styles.cheekR}`} />
              <i className={styles.mouth} />
            </span>
            <span className={styles.shadow} />
          </button>
        </div>
        <p className={styles.tally}>
          <svg className={styles.tallyIco} aria-hidden="true"><use href="#ico-heart" /></svg>
          <span>{tally}</span>
        </p>
      </div>
    </main>
  );
}
