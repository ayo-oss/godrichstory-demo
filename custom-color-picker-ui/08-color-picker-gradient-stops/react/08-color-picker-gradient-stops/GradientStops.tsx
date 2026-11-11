// GradientStops — vanilla 판(run/286/demo/08-color-picker-gradient-stops) 의 React 포트.
// 변수 3개(duration·easing·color)는 props 로 받아 CSS 변수(var(--duration) 등)로 들어온다.
// 상태는 가운데 정지점 위치 하나(0~100)뿐이다. 막대의 색 분포도, 손잡이 자리도, 아래 CSS 문자열도,
// 퍼센트 숫자도 전부 그 한 값(--p)에서 나오므로 넷이 어긋날 수가 없다.
import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./GradientStops.module.scss";

type KeyEvt = { key: string; shiftKey: boolean; preventDefault(): void };

export type GradientStopsProps = {
  midLabel?: string;
  /** "가운데 정지점 %p%" 처럼 자리표시자 하나를 가진 틀 */
  midFormat?: string;
  posLabel?: string;
  copyLabel?: string;
  copiedText?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--p"?: number;
};

function clampPercent(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)));
}

export default function GradientStops({
  midLabel = "가운데 정지점 위치",
  midFormat = "가운데 정지점 %p%",
  posLabel = "가운데",
  copyLabel = "CSS 문자열 복사",
  copiedText = "복사했습니다",
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: GradientStopsProps) {
  const [live, setLive] = useState(demo);
  const [pos, setPos] = useState(45);
  const [notice, setNotice] = useState("");
  const barRef = useRef<HTMLDivElement>(null);

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--p": pos,
  };

  // 화면에 보이는 문자열과 복사되는 문자열은 같은 pos 하나에서 나온다
  function cssText(): string {
    return `linear-gradient(90deg, #ff4d1f 0%, #ffd23f ${pos}%, #2f6df6 100%)`;
  }

  function pickAt(e: ReactPointerEvent<HTMLDivElement>) {
    const node = barRef.current;
    if (!node) return;
    const box = node.getBoundingClientRect();
    setPos(clampPercent(((e.clientX - box.left) / box.width) * 100));
  }

  function start(e: ReactPointerEvent<HTMLDivElement>) {
    setLive(false);
    // 막대 밖으로 끌어도 이 요소가 계속 포인터를 받는다
    e.currentTarget.setPointerCapture(e.pointerId);
    pickAt(e);
  }

  function drag(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) pickAt(e);
  }

  function keyMid(e: KeyEvt) {
    const step = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowRight") setPos(Math.min(100, pos + step));
    else if (e.key === "ArrowLeft") setPos(Math.max(0, pos - step));
    else return;
    e.preventDefault();
    setLive(false);
  }

  function copy() {
    setLive(false);
    if (navigator.clipboard) navigator.clipboard.writeText(cssText());
    setNotice(copiedText);
  }

  return (
    <div className={[styles.gs, live ? styles.isDemo : ""].filter(Boolean).join(" ")} style={vars}>
      <div ref={barRef} className={styles.bar} onPointerDown={start} onPointerMove={drag}>
        <span className={[styles.stop, styles.stopA].join(" ")} aria-hidden="true" />
        <span
          className={[styles.stop, styles.stopM].join(" ")}
          role="slider"
          tabIndex={0}
          aria-label={midLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pos}
          aria-valuetext={midFormat.replace("%p", String(pos))}
          onKeyDown={keyMid}
        />
        <span className={[styles.stop, styles.stopB].join(" ")} aria-hidden="true" />
      </div>
      <code className={styles.code} aria-hidden="true" />
      <div className={styles.foot}>
        <span className={styles.pos} aria-hidden="true">
          {posLabel} <b className={styles.pct} />
        </span>
        <button type="button" className={styles.copy} aria-label={copyLabel} onClick={copy}>
          <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M216,40V168H168V88H88V40Z" opacity="0.2" />
            <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z" />
          </svg>
        </button>
      </div>
      <span className={styles.liveRegion} aria-live="polite">
        {notice}
      </span>
    </div>
  );
}
