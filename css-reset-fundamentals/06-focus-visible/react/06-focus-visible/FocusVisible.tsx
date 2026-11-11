// FocusVisible — vanilla 판(run/376/demo/06-focus-visible/index.html) 의 React 포트.
// focus({preventScroll:true}) 로 실제 포커스를 옮기고 matches(':focus-visible') 로 브라우저가
// 스스로 결정한 링 종류를 읽는다. 자동 루프 동안만 demoFocus 클래스로 같은 링을 시연한다
// (스크립트가 부른 focus() 는 :focus-visible 로 판정되지 않기 때문).
import { useEffect, useRef } from "react";
import styles from "./FocusVisible.module.scss";

type Box<T> = { current: T };

const STEP_MS = 320;
const ORDER = ["padBtn1", "padBtn2", "padBtn3", "padLink"];

export default function FocusVisible() {
  const wrapRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const stateLabelRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const readoutRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = wrapRef.current;
    const stateLabel = stateLabelRef.current;
    const readout = readoutRef.current;
    if (!wrap || !stateLabel || !readout) return;

    let isDemo = true;
    let cursor = 0;

    function elFor(id: string): HTMLElement | null {
      return wrap!.querySelector<HTMLElement>("#" + id);
    }

    function describe() {
      const el = document.activeElement as HTMLElement | null;
      if (!el || !el.id || ORDER.indexOf(el.id) < 0) {
        stateLabel!.textContent = "대상 —";
        readout!.textContent = "포커스 링 종류 —";
        return;
      }
      const idx = ORDER.indexOf(el.id);
      stateLabel!.textContent = "대상 " + (idx + 1) + " / " + ORDER.length;
      const viaKeyboard = isDemo ? true : el.matches(":focus-visible");
      readout!.textContent = "포커스 링 종류 " + (viaKeyboard ? "강조 링 (키보드)" : "없음 (마우스)");
    }

    function focusAt(idx: number) {
      cursor = idx;
      for (let j = 0; j < ORDER.length; j++) {
        const el = elFor(ORDER[j]);
        if (el) el.classList.remove(styles.demoFocus);
      }
      const el = elFor(ORDER[idx]);
      if (!el) return;
      el.focus({ preventScroll: true });
      if (isDemo) el.classList.add(styles.demoFocus);
    }

    function human() {
      if (isDemo) {
        wrap!.classList.remove(styles.isDemo);
        isDemo = false;
        if (document.activeElement && (document.activeElement as HTMLElement).blur) {
          (document.activeElement as HTMLElement).blur();
        }
        describe();
      }
    }

    const cleanups: (() => void)[] = [];
    for (let i = 0; i < ORDER.length; i++) {
      const el = elFor(ORDER[i]);
      if (!el) continue;
      const onFocus = () => describe();
      const onClick = () => { human(); describe(); };
      el.addEventListener("focus", onFocus);
      el.addEventListener("click", onClick);
      cleanups.push(function () {
        el.removeEventListener("focus", onFocus);
        el.removeEventListener("click", onClick);
      });
    }

    function onKeyDown(e: KeyboardEvent) {
      human();
      if (e.key === "Tab") {
        e.preventDefault();
        const next = (cursor + (e.shiftKey ? -1 : 1) + ORDER.length) % ORDER.length;
        focusAt(next);
        describe();
      }
    }
    document.addEventListener("keydown", onKeyDown);

    let last = 0;
    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo && !reduce && ts - last >= STEP_MS) {
        last = ts;
        cursor = (cursor + 1) % ORDER.length;
        focusAt(cursor);
        describe();
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cleanups.forEach(function (fn) { fn(); });
      document.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={wrapRef}>
        <div className={styles.head}>
          <span className={styles.stateLabel} ref={stateLabelRef}>대상 —</span>
          <span className={styles.howBadge}>탭 키로 직접 이동</span>
        </div>
        <div className={styles.pad}>
          <button className={styles.padBtn} id="padBtn1" type="button">첫 번째</button>
          <button className={styles.padBtn} id="padBtn2" type="button">두 번째</button>
          <button className={styles.padBtn} id="padBtn3" type="button">세 번째</button>
          <a className={styles.padLink} id="padLink" href="#">링크</a>
        </div>
        <div className={styles.readout} ref={readoutRef}>포커스 링 종류 —</div>
      </div>
    </main>
  );
}
