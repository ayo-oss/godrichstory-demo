// DialKnob — vanilla 판(run/013/demo/03-skeuo-dial-knob/index.html) 의 React 포트.
// 노브를 드래그해 돌리면 각도만큼 값이 오르내리고 눈금 링의 바늘이 따라 섭니다.
// role="slider" + aria-valuemin/max/now, 화살표 키·Home·End 지원. 값·키프레임은 vanilla 와 같다.
// 이벤트 제네릭 대신 로컬 타입으로 선언한다(ambient 타입만 있어 implicit any 를 피한다).
import { useRef, useState } from "react";
import styles from "./DialKnob.module.scss";

export type DialKnobProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = { [k: string]: any };
type PtrEvt = {
  clientX: number;
  clientY: number;
  pointerId: number;
  currentTarget: { setPointerCapture: (id: number) => void };
};
type KeyEvt = { key: string; shiftKey: boolean; preventDefault: () => void };

const MIN = -135; // 도(°). 0도는 정위(12시 방향)
const MAX = 135;
const KNOB_LABEL = "밝기 조절 다이얼";
const LABEL_TEXT = "밝기";
const HINT_TEXT = "드래그나 화살표 키로 조절";
const VAL_TEXT = "{v}퍼센트";
const DIGITS = ["0%", "20%", "40%", "60%", "80%", "100%"];

export default function DialKnob({
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)", // = $ease-spring
  color = "#ffffff",
}: DialKnobProps) {
  const [value, setValue] = useState(0);
  const [demo, setDemo] = useState(true);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const angle = Math.round(MIN + (MAX - MIN) * value / 100); // 백분율 값을 각도로
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--angle": String(angle),
    "--fill": (value / 100).toFixed(3),
  };
  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");

  function angleOf(x: number, y: number): number {
    const el = ringRef.current;
    if (!el) { return MIN; }
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const deg = Math.atan2(x - cx, cy - y) * 180 / Math.PI; // 정위가 0도, 시계 방향이 양수
    return Math.max(MIN, Math.min(MAX, deg));
  }
  function valueAt(x: number, y: number): number {
    return Math.round((angleOf(x, y) - MIN) / (MAX - MIN) * 100);
  }
  function onPointerDown(e: PtrEvt) {
    setDemo(false);
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setValue(valueAt(e.clientX, e.clientY));
  }
  function onPointerMove(e: PtrEvt) {
    if (!dragging.current) {
      setDemo(false);
      return;
    }
    setValue(valueAt(e.clientX, e.clientY));
  }
  function onPointerUp() {
    dragging.current = false;
  }
  function onKeyDown(e: KeyEvt) {
    const step = e.shiftKey ? 10 : 5;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      setValue((v) => Math.min(100, v + step));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      setValue((v) => Math.max(0, v - step));
    } else if (e.key === "Home") {
      setValue(0);
    } else if (e.key === "End") {
      setValue(100);
    } else {
      return;
    }
    e.preventDefault();
    setDemo(false);
  }

  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.ring} ref={ringRef}>
          <span className={styles.ticks} aria-hidden="true"></span>
          <span className={styles.arc} aria-hidden="true"></span>
          <span className={styles.needle} aria-hidden="true"></span>
          <div className={styles.knobWrap}>
            <button
              className={styles.knob}
              type="button"
              role="slider"
              aria-label={KNOB_LABEL}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={value}
              aria-valuetext={VAL_TEXT.replace("{v}", String(value))}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onKeyDown}
            ></button>
          </div>
          <span className={styles.scaleMin} aria-hidden="true">0</span>
          <span className={styles.scaleMax} aria-hidden="true">100</span>
        </div>
        <div className={styles.side}>
          <p className={styles.label}>{LABEL_TEXT}</p>
          <p className={styles.readout}>
            <b className={styles.value}>{value}%</b>
            <span className={styles.demoDigits} aria-hidden="true">
              {DIGITS.map((d, i) => (
                <i className={`${styles.digit} ${styles["digit" + String(i)]}`} key={d}>{d}</i>
              ))}
            </span>
          </p>
          <p className={styles.hint}>{HINT_TEXT}</p>
        </div>
      </div>
    </main>
  );
}
