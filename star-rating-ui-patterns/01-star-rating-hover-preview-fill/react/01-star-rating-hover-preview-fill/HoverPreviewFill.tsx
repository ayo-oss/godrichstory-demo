import { useEffect, useRef } from "react";
import styles from "./HoverPreviewFill.module.scss";

const STAR_PATH =
  "M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 19.771l-7.416 3.642 1.48-8.279-6.064-5.828 8.332-1.151z";

export default function HoverPreviewFill() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const row = root.querySelector<HTMLDivElement>(`.${styles.row}`);
    const readout = root.querySelector<HTMLDivElement>(`.${styles.readout}`);
    const numEl = root.querySelector<HTMLElement>(`.${styles.num}`);
    const pctEl = root.querySelector<HTMLElement>(`.${styles.pct}`);
    if (!row || !readout || !numEl || !pctEl) return;
    const stars = Array.prototype.slice.call(
      row.querySelectorAll(`.${styles.star}`)
    ) as HTMLElement[];
    const TOTAL = stars.length;
    let value = 3;

    // 계산 겹: 채움 개수 n 을 전체 별 개수로 나눈 비율(산술)을 그대로 화면 숫자로 보여준다 —
    // 채움은 CSS 클래스가 아니라 이 비율 계산에서 나온 정수를 그대로 쓴다.
    function ratioOf(n: number) {
      return Math.round((n / TOTAL) * 100);
    }

    function paint(n: number, isPreview?: boolean) {
      stars.forEach((s, idx) => {
        s.classList.toggle(styles.filled, idx < n);
      });
      numEl!.textContent = String(n);
      pctEl!.textContent = String(ratioOf(n));
      readout!.classList.toggle(styles.preview, !!isPreview);
      readout!.firstChild!.textContent = isPreview ? "미리보기 " : "선택 ";
    }

    function previewTo(i: number) { paint(i, true); }
    function revertToValue() { paint(value, false); }
    function commit(i: number) {
      value = i;
      stars.forEach((s, idx) => s.setAttribute("aria-checked", String(idx < value)));
      paint(value, false);
    }

    function onEnter(i: number) {
      return () => { stopAutoplay(); previewTo(i); };
    }
    function onClick(i: number) {
      return () => commit(i);
    }
    const enterHandlers: Array<() => void> = [];
    const clickHandlers: Array<() => void> = [];
    stars.forEach((s, idx) => {
      const i = idx + 1;
      const eh = onEnter(i);
      const ch = onClick(i);
      enterHandlers.push(eh);
      clickHandlers.push(ch);
      s.addEventListener("pointerenter", eh);
      s.addEventListener("click", ch);
    });
    function onLeave() { revertToValue(); }
    row.addEventListener("pointerleave", onLeave);

    paint(value, false);

    // 자동 루프: 별 순서대로 미리보기 값을 올렸다 원래 값으로 되돌리는 것을 반복해 보여준다.
    let step = 0;
    let autoTimer: number | null = null;
    function autoTick() {
      if (step < TOTAL) { previewTo(step + 1); }
      else { revertToValue(); }
      step = (step + 1) % (TOTAL + 2);
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 280); autoTick(); }

    return () => {
      stopAutoplay();
      stars.forEach((s, idx) => {
        s.removeEventListener("pointerenter", enterHandlers[idx]);
        s.removeEventListener("click", clickHandlers[idx]);
      });
      row.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.sr}>
        <div className={styles.row} role="radiogroup" aria-label="별점">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" className={styles.star} role="radio" aria-checked="false">
              <svg viewBox="0 0 24 24"><path d={STAR_PATH} /></svg>
            </button>
          ))}
        </div>
        <div className={styles.readout}>
          선택 <b className={styles.num}>3</b>/5 · <span className={styles.pct}>60</span>%
        </div>
      </div>
    </div>
  );
}
