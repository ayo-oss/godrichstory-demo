// InertiaDragToggle — vanilla 판(run/076/demo/09-real-inertia-drag-toggle/index.html) 의 React 포트.
// 끄는 동안은 손끝을 그대로 따라오고(transition 없음), 놓는 순간에만 관성이 붙는다.
// 값·키프레임은 vanilla 와 같다(다시 타이핑하지 않는다). 드래그·클릭 모두 미리보기 루프를 뗀다.
import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./InertiaDragToggle.module.scss";

export type InertiaDragToggleProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = { [k: string]: any };
type PtrEvt = ReactPointerEvent<HTMLButtonElement>;

const LABEL_TEXT = "잠금 해제";
const SWITCH_LABEL = "잠금 해제 스위치";
const HINT_TEXT = "끌어서 밀어 보세요";
const STATE_OFF = "잠김";
const STATE_ON = "열림";

export default function InertiaDragToggle({
  duration = 300,
  easing = "cubic-bezier(.2, 1.4, .4, 1)", // = $ease-pop
  color = "#0a4fe8",
}: InertiaDragToggleProps) {
  const [open, setOpen] = useState(false);
  const [demo, setDemo] = useState(true);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLButtonElement>(null);
  const drag = useRef({ on: false, startX: 0, startOffset: 0, offset: 0, moved: false });
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  const cls = [
    styles.root,
    demo ? styles.isDemo : "",
    open ? styles.isOpen : "",
    dragging ? styles.isDragging : "",
  ].filter(Boolean).join(" ");

  function travel(): number {
    // 노브가 갈 수 있는 최대 거리 = 트랙 안폭 - 노브 폭 (레일 여백 4px 씩)
    const track = trackRef.current;
    const knob = knobRef.current;
    if (!track || !knob) return 0;
    return track.clientWidth - knob.offsetWidth - 8;
  }
  function place(px: number) {
    const knob = knobRef.current;
    const d = drag.current;
    if (!knob || !d) return;
    d.offset = Math.max(0, Math.min(travel(), px));
    knob.style.transform = "translateX(" + d.offset + "px)";
  }
  function settle(next: boolean) {
    const knob = knobRef.current;
    const d = drag.current;
    if (knob) knob.style.transform = "";
    setOpen(next);
    if (d) d.offset = next ? travel() : 0;
  }
  function onDown(e: PtrEvt) {
    const d = drag.current;
    if (!d) return;
    setDemo(false);
    d.on = true;
    d.moved = false;
    d.startX = e.clientX;
    d.startOffset = open ? travel() : 0;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onMove(e: PtrEvt) {
    const d = drag.current;
    if (!d || !d.on) return;
    // 끌기가 일어난 뒤 따라오는 click 은 토글이 아니라 끌기의 끝이다
    if (Math.abs(e.clientX - d.startX) > 6) d.moved = true;
    place(d.startOffset + (e.clientX - d.startX));
  }
  function onUp() {
    const d = drag.current;
    if (!d || !d.on) return;
    d.on = false;
    setDragging(false);
    // 절반을 넘겼으면 남은 거리를 관성으로 마저 달리고, 못 넘겼으면 제자리로 돌아온다
    settle(d.offset > travel() / 2);
  }
  function onKey() {
    const d = drag.current;
    setDemo(false);
    if (d && d.moved) {
      d.moved = false;
      return; // 끌기 직후의 click 은 무시한다
    }
    settle(!open);
  }

  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <section className={styles.panel}>
          <p className={styles.label}>{LABEL_TEXT}</p>
          <div className={styles.track} ref={trackRef}>
            <span className={styles.fill} aria-hidden="true"></span>
            <button
              className={styles.knob}
              type="button"
              role="switch"
              aria-checked={open}
              aria-label={SWITCH_LABEL}
              ref={knobRef}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onClick={onKey}
            >
              <span className={styles.grip} aria-hidden="true"></span>
            </button>
          </div>
          <p className={styles.hint}>{HINT_TEXT}</p>
          <p className={styles.state} role="status">
            <span className={styles.wordOff}>{STATE_OFF}</span>
            <span className={styles.wordOn}>{STATE_ON}</span>
          </p>
        </section>
      </div>
    </main>
  );
}
