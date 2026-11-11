// FormInherit — vanilla 판(run/376/demo/05-form-inherit/index.html) 의 React 포트.
// 상속 전/후를 토글해 입력창·버튼의 렌더 font-size·font-weight 를 getComputedStyle 로 다시 재
// 문단 값과 일치하는지 판정한다.
import { useEffect, useRef } from "react";
import styles from "./FormInherit.module.scss";

type Box<T> = { current: T };

const STEP_MS = 260;

export default function FormInherit() {
  const wrapRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const toggleBtnRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const ghostBtnRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const stateLabelRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const sampleRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const fieldARef = useRef(null) as unknown as Box<HTMLInputElement>;
  const readoutRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = wrapRef.current;
    const toggleBtn = toggleBtnRef.current;
    const ghostBtn = ghostBtnRef.current;
    const stateLabel = stateLabelRef.current;
    const sample = sampleRef.current;
    const fieldA = fieldARef.current;
    const readout = readoutRef.current;
    if (!wrap || !toggleBtn || !ghostBtn || !stateLabel || !sample || !fieldA || !readout) return;

    let isDemo = true;
    let on = false;

    function measure() {
      const ps = getComputedStyle(sample!).fontSize;
      const fs = getComputedStyle(fieldA!).fontSize;
      const pw = getComputedStyle(sample!).fontWeight;
      const fw = getComputedStyle(fieldA!).fontWeight;
      const match = ps === fs && pw === fw;
      readout!.textContent = "입력창 " + fs + " · " + fw + " · 문단과 일치 " + (match ? "O" : "X");
    }

    function apply(next: boolean) {
      on = next;
      wrap!.classList.toggle(styles.inherited, on);
      stateLabel!.textContent = on ? "상속 후" : "상속 전";
      toggleBtn!.setAttribute("aria-pressed", String(on));
      measure();
    }

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }
    function onToggleClick() { human(); apply(!on); }
    function onGhostClick() { human(); }
    function onFieldEvent() { human(); }
    toggleBtn.addEventListener("click", onToggleClick);
    ghostBtn.addEventListener("click", onGhostClick);
    fieldA.addEventListener("input", onFieldEvent);
    fieldA.addEventListener("focus", onFieldEvent);

    let last = 0;
    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo && !reduce && ts - last >= STEP_MS) { last = ts; apply(!on); }
      rafRef.current = requestAnimationFrame(loop);
    }
    apply(false);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      toggleBtn!.removeEventListener("click", onToggleClick);
      ghostBtn!.removeEventListener("click", onGhostClick);
      fieldA!.removeEventListener("input", onFieldEvent);
      fieldA!.removeEventListener("focus", onFieldEvent);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={wrapRef}>
        <div className={styles.head}>
          <span className={styles.stateLabel} ref={stateLabelRef}>상속 전</span>
          <button className={styles.toggleBtn} ref={toggleBtnRef} type="button" aria-pressed="false">폰트 상속 적용</button>
        </div>
        <p className={styles.sample} ref={sampleRef}>문단 글꼴 15px · 두께 700</p>
        <div className={styles.fieldRow}>
          <input className={styles.field + " " + styles.inheritField} ref={fieldARef} type="text" defaultValue="이름 입력" aria-label="입력창 예시" />
          <button className={styles.ghostBtn} ref={ghostBtnRef} type="button">버튼 글꼴</button>
        </div>
        <div className={styles.readout} ref={readoutRef}>입력창 —px · 문단과 일치 —</div>
      </div>
    </main>
  );
}
