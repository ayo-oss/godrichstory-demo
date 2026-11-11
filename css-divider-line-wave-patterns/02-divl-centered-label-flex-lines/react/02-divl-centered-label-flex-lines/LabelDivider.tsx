// LabelDivider — vanilla 판(02-divl-centered-label-flex-lines) 의 React 포트.
// 가운데 글자 폭을 재서 양쪽 선 폭을 (줄 폭 - 글자 폭 - LABEL_GAP * 2) / 2 로 직접 계산한다.
import { useEffect, useRef } from "react";
import styles from "./LabelDivider.module.scss";

type Box<T> = { current: T };

const LABEL_GAP = 12;
const LINE_H_PX = 6;
const CYCLE_MS = 2000;
const NARROW_PX = 180;
const WIDE_PX = 420;
const LABELS: string[] = ["또는", "다른 방법으로 계속", "여기까지 읽은 내용"];

export default function LabelDivider() {
  const cardRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const rowRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const leftRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const rightRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const labelRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  const btnRef = useRef<HTMLButtonElement | null>(null) as Box<HTMLButtonElement | null>;
  const pxRef = useRef<HTMLElement | null>(null) as Box<HTMLElement | null>;

  useEffect(() => {
    const card = cardRef.current;
    const row = rowRef.current;
    const left = leftRef.current;
    const right = rightRef.current;
    const label = labelRef.current;
    const btn = btnRef.current;
    const pxEl = pxRef.current;
    if (!card || !row || !left || !right || !label || !btn || !pxEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demo = !reduce;
    let labelIndex = 0;
    let t0: number | null = null;
    let raf = 0;

    const layout = (): void => {
      const rowW = row.getBoundingClientRect().width;
      const labelW = label.getBoundingClientRect().width;
      const side = Math.max(0, (rowW - labelW - LABEL_GAP * 2) / 2);
      left.style.width = side.toFixed(1) + "px";
      right.style.width = side.toFixed(1) + "px";
      pxEl.textContent = String(Math.round(side));
    };
    const setLabel = (i: number): void => {
      labelIndex = i;
      label.textContent = LABELS[i];
    };
    const onClick = (): void => {
      demo = false;
      setLabel((labelIndex + 1) % LABELS.length);
      layout();
    };
    btn.addEventListener("click", onClick);

    const tick = (ts: number): void => {
      if (t0 === null) t0 = ts;
      if (demo) {
        const now = ts - t0;
        const phase = (now % CYCLE_MS) / CYCLE_MS;
        const wave = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
        card.style.width = (NARROW_PX + (WIDE_PX - NARROW_PX) * wave).toFixed(1) + "px";
        const i = Math.floor((now / CYCLE_MS) * 3) % LABELS.length;
        if (i !== labelIndex) setLabel(i);
        layout();
      }
      raf = requestAnimationFrame(tick);
    };

    left.style.height = LINE_H_PX + "px";
    right.style.height = LINE_H_PX + "px";
    layout();
    if (!reduce) raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div className={styles.dv}>
      <div className={styles.card} ref={cardRef}>
        <div className={styles.row} ref={rowRef} role="separator">
          <span className={styles.side} ref={leftRef} />
          <span className={styles.label} ref={labelRef}>또는</span>
          <span className={styles.sideRight} ref={rightRef} />
        </div>
      </div>
      <div className={styles.bar}>
      <button className={styles.btn} ref={btnRef} type="button">글자 바꾸기</button>
      <p className={styles.meta}>
        <span className={styles.tag}>LINE</span> <b ref={pxRef}>0</b>
        <span>px</span>
      </p>
      </div>
    </div>
  );
}
