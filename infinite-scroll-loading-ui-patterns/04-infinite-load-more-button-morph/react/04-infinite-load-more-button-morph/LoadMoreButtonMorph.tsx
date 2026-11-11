import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./LoadMoreButtonMorph.module.scss";

// 더 보기 버튼 모핑 — morphTo() 가 라벨의 실측 폭 + 여백을 목표 너비로 삼고,
// 매 프레임 현재 너비를 목표 쪽으로 24% 씩 당기는 lerp(관성)로 버튼 폭을 바꾼다.
const BATCH_SIZE = 6;
const TOTAL = 24;
const LOAD_DELAY_MS = 560;
const WIDTH_LERP = 0.24;
const PADDING_X = 40;

export default function LoadMoreButtonMorph() {
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [rows, setRows] = useState(4);
  const [label, setLabel] = useState("더 보기 (20)");
  const [btnState, setBtnState] = useState<"idle" | "loading" | "done">("idle");
  const rowsRef = useRef(4);
  rowsRef.current = rows;
  const stateRef = useRef<"idle" | "loading" | "done">("idle");
  stateRef.current = btnState;
  const widthRafRef = useRef<number | null>(null);
  const targetWidthRef = useRef<number>(0);
  const autoplayRef = useRef<number | null>(null);

  // 계산 겹: 라벨 문자열이 바뀔 때마다 실제 렌더 폭(getBoundingClientRect)을 재고 그 값 + 여백을
  // 목표 너비로 삼아, 매 프레임 현재 너비를 목표 쪽으로 24% 씩 당기는 lerp 로 버튼을 모핑한다.
  const morphTo = useCallback((text: string) => {
    const btn = btnRef.current;
    const labelEl = labelRef.current;
    if (!btn || !labelEl) { return; }
    labelEl.textContent = text;
    const natural = labelEl.getBoundingClientRect().width;
    targetWidthRef.current = Math.round(natural + PADDING_X);
    if (widthRafRef.current !== null) { return; }
    let current = btn.getBoundingClientRect().width;
    const tick = () => {
      const target = targetWidthRef.current ?? 0;
      current += (target - current) * WIDTH_LERP;
      btn.style.width = current + "px";
      if (Math.abs(target - current) > 0.5) {
        widthRafRef.current = window.requestAnimationFrame(tick);
      } else {
        btn.style.width = target + "px";
        widthRafRef.current = null;
      }
    };
    widthRafRef.current = window.requestAnimationFrame(tick);
  }, []);

  const labelFor = useCallback(() => {
    const shown = rowsRef.current ?? 0;
    const remaining = TOTAL - shown;
    const st = stateRef.current ?? "idle";
    if (st === "done") { return "모두 확인했어요"; }
    if (st === "loading") { return "불러오는 중"; }
    return "더 보기 (" + remaining + ")";
  }, []);

  const press = useCallback(() => {
    if (stateRef.current !== "idle") { return; }
    setBtnState("loading");
    setLabel(labelFor());
    morphTo(labelFor());
    window.setTimeout(() => {
      setRows((prev) => Math.min(prev + BATCH_SIZE, TOTAL));
      const after = Math.min((rowsRef.current ?? 0) + BATCH_SIZE, TOTAL);
      if (after >= TOTAL) {
        setBtnState("done");
      } else {
        setBtnState("idle");
      }
      const shownNow = stateRef.current === "done" ? TOTAL : after;
      const st = shownNow >= TOTAL ? "done" : "idle";
      setLabel(st === "done" ? "모두 확인했어요" : "더 보기 (" + (TOTAL - shownNow) + ")");
      morphTo(st === "done" ? "모두 확인했어요" : "더 보기 (" + (TOTAL - shownNow) + ")");
    }, LOAD_DELAY_MS);
  }, [labelFor, morphTo]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      autoplayRef.current = window.setInterval(() => {
        press();
      }, 780);
    }
    return () => {
      if (autoplayRef.current !== null) { window.clearInterval(autoplayRef.current); }
      if (widthRafRef.current !== null) { window.cancelAnimationFrame(widthRafRef.current); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rowEls = [];
  for (let i = 0; i < rows; i += 1) {
    rowEls.push(
      <li key={i} className={styles["lbm__row"]}>댓글 {String(i + 1).padStart(2, "0")}</li>
    );
  }

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.lbm} ${styles["is-demo"]}`} id="lbm">
        <ul className={styles["lbm__list"]}>{rowEls}</ul>
        <button
          ref={btnRef}
          className={`${styles["lbm__btn"]} ${btnState === "loading" ? styles["lbm__btn--loading"] : ""} ${btnState === "done" ? styles["lbm__btn--done"] : ""}`}
          type="button"
          disabled={btnState === "done"}
          onClick={() => {
            rootRef.current?.classList.remove(styles["is-demo"]);
            if (autoplayRef.current !== null) { window.clearInterval(autoplayRef.current); }
            press();
          }}
        >
          <span ref={labelRef} className={styles["lbm__label"]}>{label}</span>
        </button>
      </div>
    </main>
  );
}
