// PullKnob — vanilla 판(run/013/demo/06-skeuo-pull-knob) 의 React 포트.
// 노브를 아래로 당기면 잠깐 늘어났다가 잠금이 풀리며 덮개가 열리고 손을 놓으면 제자리로 돌아간다.
// 당김값 --pull(단위 없는 수) 하나가 이동과 늘어남을 함께 구동한다. 값·타이밍은 vanilla 와 같다.
import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./PullKnob.module.scss";

export type PullKnobProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--pull"?: string };
type Start = { y: number; active: boolean };
type PtrEvt = ReactPointerEvent<HTMLButtonElement>;
type KeyEvt = { key: string; preventDefault(): void };

const PULL_MAX = 44;
const THRESHOLD = 30;
const HINT = "아래로 당겨 보세요";
const ARIA_LABEL = "당겨 여는 잠금 노브";
const STATE_LOCK = "잠김";
const STATE_OPEN = "열림";

export default function PullKnob({
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: PullKnobProps) {
  const [open, setOpen] = useState(false);
  const [demo, setDemo] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [pull, setPull] = useState(0);
  const startRef = useRef<Start | null>(null);
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--pull": String(pull),
  };

  function onPointerDown(e: PtrEvt) {
    setDemo(false);
    setDragging(true);
    startRef.current = { y: e.clientY, active: true };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onPointerMove(e: PtrEvt) {
    const st = startRef.current;
    if (!st || !st.active) { return; }
    const dy = e.clientY - st.y;
    setPull(Math.min(PULL_MAX, Math.max(0, dy)));
  }
  function onPointerUp(e: PtrEvt) {
    const st = startRef.current;
    if (!st || !st.active) { return; }
    st.active = false;
    const moved = e.clientY - st.y;
    setDragging(false);
    setPull(0);
    if (moved >= THRESHOLD) { setOpen(true); }
    else if (moved >= -6 && moved < 6) { setOpen((v) => !v); }
  }
  function onKeyDown(e: KeyEvt) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setDemo(false);
      setOpen((v) => !v);
    }
  }

  const cls = [
    styles.root,
    demo ? styles.isDemo : "",
    open ? styles.isOpen : "",
    dragging ? styles.isDrag : "",
  ].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-hand" viewBox="0 0 256 256" fill="currentColor"><g><path d="M208 108v44a80 80 0 0 1-160 0v-12a20 20 0 0 1 20-20h20V92a20 20 0 0 1 40 0a20 20 0 0 1 40 0v16a20 20 0 0 1 40 0" opacity=".2"/><path d="M188 80a27.8 27.8 0 0 0-13.36 3.4a28 28 0 0 0-46.64-11A28 28 0 0 0 80 92v20H68a28 28 0 0 0-28 28v12a88 88 0 0 0 176 0v-44a28 28 0 0 0-28-28m12 72a72 72 0 0 1-144 0v-12a12 12 0 0 1 12-12h12v24a8 8 0 0 0 16 0V92a12 12 0 0 1 24 0v28a8 8 0 0 0 16 0V92a12 12 0 0 1 24 0v28a8 8 0 0 0 16 0v-12a12 12 0 0 1 24 0Z"/></g></symbol>
        </defs>
      </svg>
      <div className={cls} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} aria-hidden="true"><use href="#ico-hand" /></svg>
          <span>{HINT}</span>
        </p>
        <div className={styles.body}>
          <div className={styles.lidWrap}>
            <div className={styles.mouth} />
            <div className={styles.lid} id="lid"><i className={styles.lidFace} /></div>
          </div>
          <p className={styles.state}>
            <i className={styles.dot} />
            <span className={styles.stateLock}>{STATE_LOCK}</span>
            <span className={styles.stateOpen}>{STATE_OPEN}</span>
          </p>
          <div className={styles.neck}>
            <i className={styles.stem} />
            <button
              className={styles.knob}
              type="button"
              aria-expanded={open}
              aria-controls="lid"
              aria-label={ARIA_LABEL}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onKeyDown={onKeyDown}
            >
              <i className={styles.grip} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
