// SelectAllCascade — vanilla 판(run/368/demo/05-custom-checkbox-select-all-cascade/index.html) 의 React 포트.
// 각 자식 박스의 transition-delay 를 인덱스 × STAGGER_MS 로 계산해 심는다 — 값 자체는 동시에
// 바뀌지만 화면에 드러나는 시점이 계단처럼 순서를 갖는다.
import { useEffect, useRef } from "react";
import styles from "./SelectAllCascade.module.scss";

type Box<T> = { current: T };

const CHILDREN = [
  { id: "child0", label: "보고서.pdf" },
  { id: "child1", label: "사진.jpg" },
  { id: "child2", label: "회의록.docx" },
  { id: "child3", label: "시트.xlsx" },
];

export default function SelectAllCascade() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const parentRef = useRef(null) as unknown as Box<HTMLInputElement>;
  const parentBoxRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const childRefs = useRef([null, null, null, null]) as unknown as Box<(HTMLInputElement | null)[]>;
  const childBoxRefs = useRef([null, null, null, null]) as unknown as Box<(HTMLSpanElement | null)[]>;

  useEffect(() => {
    const STAGGER_MS = 90; // 계산 겹 상수: 하위 박스가 한 칸씩 늦게 바뀌는 간격
    const CYCLE_MS = 700; // 자동 루프가 전체선택을 켜고 끄는 간격
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const parent = parentRef.current;
    const parentBox = parentBoxRef.current;
    const childInputs = childRefs.current;
    const childBoxes = childBoxRefs.current;
    if (!root || !parent || !parentBox) return;

    let isDemo = true;

    function human() {
      if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; }
    }

    // 계산 겹: 각 자식 박스의 transition-delay 를 인덱스 × STAGGER_MS 로 만든다
    childBoxes.forEach((b, i) => {
      if (b) b.style.setProperty("transition-delay", i * STAGGER_MS + "ms");
    });

    function paintChildren() {
      childInputs.forEach((c, i) => { childBoxes[i]?.classList.toggle(styles.boxOn, c ? c.checked : false); });
    }

    function paintParent() {
      const count = childInputs.filter((c) => c?.checked).length;
      const all = count === childInputs.length, none = count === 0;
      parent!.checked = all;
      parent!.indeterminate = !all && !none;
      parentBox!.classList.toggle(styles.boxOn, all);
      parentBox!.classList.toggle(styles.boxMixed, !all && !none);
    }

    const childHandlers = childInputs.map((c) => {
      const fn = () => { human(); paintChildren(); paintParent(); };
      c?.addEventListener("change", fn);
      return fn;
    });

    function onParentChange() {
      human();
      const next = parent!.checked;
      childInputs.forEach((c) => { if (c) c.checked = next; });
      paintChildren();
      paintParent();
    }
    parent.addEventListener("change", onParentChange);

    let cycleStart = 0;
    let lastState = false;
    let rafId = 0;

    function loop(ts: number) {
      if (!cycleStart) cycleStart = ts;

      if (isDemo) {
        const step = Math.floor((ts - cycleStart) / CYCLE_MS) % 2 === 1;
        if (step !== lastState) {
          lastState = step;
          childInputs.forEach((c) => { if (c) c.checked = step; });
          paintChildren();
          paintParent();
        }
      }

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);

    return () => {
      childInputs.forEach((c, i) => c?.removeEventListener("change", childHandlers[i]));
      parent.removeEventListener("change", onParentChange);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cba + " " + styles.isDemo} ref={rootRef}>
        <label className={styles.cbaRow + " " + styles.cbaRowParent}>
          <input type="checkbox" className={styles.cbaInput} ref={parentRef} />
          <span className={styles.cbaBox} ref={parentBoxRef} aria-hidden="true">
            <svg viewBox="0 0 20 20" width={14} height={14}>
              <path className={styles.cbaCheck} d="M4 10.5l3.5 3.5L16 5.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
              <line className={styles.cbaDash} x1={5} y1={10} x2={15} y2={10} stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" />
            </svg>
          </span>
          <span className={styles.cbaText}>파일 전체 선택</span>
        </label>
        <div className={styles.cbaChildren}>
          {CHILDREN.map((c, i) => (
            <label className={styles.cbaRow} key={c.id}>
              <input
                type="checkbox"
                className={styles.cbaInput}
                ref={(el: HTMLInputElement | null) => { childRefs.current[i] = el; }}
              />
              <span
                className={styles.cbaBox}
                ref={(el: HTMLSpanElement | null) => { childBoxRefs.current[i] = el; }}
                aria-hidden="true"
              >
                <svg viewBox="0 0 20 20" width={12} height={12}>
                  <path d="M4 10.5l3.5 3.5L16 5.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className={styles.cbaText}>{c.label}</span>
            </label>
          ))}
        </div>
      </div>
    </main>
  );
}
