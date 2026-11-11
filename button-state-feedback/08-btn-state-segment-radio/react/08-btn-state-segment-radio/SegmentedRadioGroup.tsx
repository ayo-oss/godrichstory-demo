import { useCallback, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SegmentedRadioGroup.module.scss";

export type SegmentedRadioGroupProps = {
  labels?: [string, string, string];   // 알약 이동폭이 80px 고정이라 칸은 세 개다
  groupLabel?: string;
  note?: string;
  duration?: number;
  easing?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };
// DOM 전역 타입을 react 에서 가져오지 않는다 — 쓰는 속성만 여기에 적는다
type KeyEvt = { key: string; preventDefault(): void };
type Focusable = { focus(opt: { preventScroll: boolean }): void };

export default function SegmentedRadioGroup({
  labels = ["Monthly", "Yearly", "Lifetime"],
  groupLabel = "Choose a billing cycle",
  note = "Pin the segment width so the pill never drifts",
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
}: SegmentedRadioGroupProps) {
  const [demo, setDemo] = useState(true); // 처음엔 자동 루프, 사람이 건드리면 끈다
  const [at, setAt] = useState(0);
  const segs = useRef<(Focusable | null)[]>([]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };

  const pick = useCallback((i: number) => {
    setDemo(false);
    setAt(i);
  }, []);

  // 좌우 화살표로 이동 — 활성 요소를 뒤지지 않고 칸 번호를 그대로 쓴다
  const onKeyDown = useCallback((e: KeyEvt, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    setDemo(false);
    const n = (i + (e.key === "ArrowRight" ? 1 : labels.length - 1)) % labels.length;
    setAt(n);
    // preventScroll — iframe 안에서 부모 페이지가 끌려가지 않게
    const segEls = segs.current;
    if (segEls) segEls[n]?.focus({ preventScroll: true });
  }, [labels.length]);

  return (
    <div className={`${styles.sg} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.bar} role="radiogroup" aria-label={groupLabel} data-at={String(at)}>
        <span className={styles.pill} aria-hidden="true" />
        {labels.map((label, i) => (
          <button
            key={label}
            ref={(el: Focusable | null) => { const segEls = segs.current; if (segEls) segEls[i] = el; }}
            className={styles.seg}
            type="button"
            role="radio"
            aria-checked={at === i}
            data-at={String(i)}
            onClick={() => pick(i)}
            onKeyDown={(e: KeyEvt) => onKeyDown(e, i)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className={styles.note}>{note}</p>
    </div>
  );
}
