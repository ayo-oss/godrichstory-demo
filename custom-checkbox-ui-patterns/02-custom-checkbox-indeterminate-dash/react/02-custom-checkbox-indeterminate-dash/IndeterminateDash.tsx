// IndeterminateDash — vanilla 판(run/368/demo/02-custom-checkbox-indeterminate-dash/index.html) 의 React 포트.
// 자식 선택 비율(ratio)을 계산해 네이티브 indeterminate 값과 배경 알파(--cbi-alpha)를 함께 만든다.
import { useEffect, useRef } from "react";
import styles from "./IndeterminateDash.module.scss";

type Box<T> = { current: T };

const CHILDREN = [
  { id: "child0", label: "이메일 알림" },
  { id: "child1", label: "문자 알림" },
  { id: "child2", label: "푸시 알림" },
];

export default function IndeterminateDash() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const parentRef = useRef(null) as unknown as Box<HTMLInputElement>;
  const parentBoxRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const childRefs = useRef([null, null, null]) as unknown as Box<(HTMLInputElement | null)[]>;
  const childBoxRefs = useRef([null, null, null]) as unknown as Box<(HTMLSpanElement | null)[]>;
  const timerRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const MIX_ALPHA = 0.22; // 계산 겹 상수: 자식이 0개 선택됐을 때도 남기는 최소 배경 알파
    const CYCLE_MS = 520; // 자동 루프가 자식 하나씩 상태를 바꾸는 간격
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const parent = parentRef.current;
    const parentBox = parentBoxRef.current;
    const children = childRefs.current;
    const childBoxes = childBoxRefs.current;
    if (!root || !parent || !parentBox) return;

    let isDemo = true;

    function human() {
      if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; }
    }

    function paintChildren() {
      children.forEach((c, i) => { childBoxes[i]?.classList.toggle(styles.boxOn, c ? c.checked : false); });
    }

    function paintParent() {
      paintChildren();
      const checkedCount = children.filter((c) => c?.checked).length;
      const ratio = checkedCount / children.length; // 계산 겹: 선택 비율 값
      const all = ratio === 1, none = ratio === 0;
      parent!.checked = all;
      parent!.indeterminate = !all && !none;
      parentBox!.classList.toggle(styles.boxOn, all);
      parentBox!.classList.toggle(styles.boxMixed, !all && !none);
      // 계산 겹: 선택 비율을 배경 알파로 직접 사영한다(MIX_ALPHA 를 바닥으로 두고 남은 폭을 ratio 만큼 채움)
      const alpha = none ? 0 : (MIX_ALPHA + (1 - MIX_ALPHA) * ratio);
      parentBox!.style.setProperty("--cbi-alpha", alpha.toFixed(3));
    }

    const childHandlers = children.map((c) => {
      const fn = () => { human(); paintParent(); };
      c?.addEventListener("change", fn);
      return fn;
    });

    function onParentChange() {
      human();
      const next = parent!.checked;
      children.forEach((c) => { if (c) c.checked = next; });
      paintParent();
    }
    parent.addEventListener("change", onParentChange);

    const SEQ = [
      [false, false, false], [true, false, false], [true, true, false], [true, true, true],
      [true, true, false], [true, false, false], [false, false, false],
    ];
    let si = 0;

    function autoTick() {
      const state = SEQ[si];
      children.forEach((c, i) => { if (c) c.checked = state[i]; });
      paintParent();
      si = (si + 1) % SEQ.length;
    }

    if (!reduce) { timerRef.current = window.setInterval(autoTick, CYCLE_MS); autoTick(); }
    else { autoTick(); }

    return () => {
      children.forEach((c, i) => c?.removeEventListener("change", childHandlers[i]));
      parent.removeEventListener("change", onParentChange);
      window.clearInterval(timerRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cbi + " " + styles.isDemo} ref={rootRef}>
        <label className={styles.cbiRow + " " + styles.cbiRowParent}>
          <input type="checkbox" className={styles.cbiInput} ref={parentRef} />
          <span className={styles.cbiBox} ref={parentBoxRef} aria-hidden="true">
            <svg className={styles.cbiSvg} viewBox="0 0 20 20" width={14} height={14}>
              <path className={styles.cbiCheck} d="M4 10.5l3.5 3.5L16 5.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
              <line className={styles.cbiDash} x1={5} y1={10} x2={15} y2={10} stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" />
            </svg>
          </span>
          <span className={styles.cbiText}>알림 전체 선택</span>
        </label>
        <div className={styles.cbiChildren}>
          {CHILDREN.map((c, i) => (
            <label className={styles.cbiRow} key={c.id}>
              <input
                type="checkbox"
                className={styles.cbiInput}
                ref={(el: HTMLInputElement | null) => { childRefs.current[i] = el; }}
              />
              <span
                className={styles.cbiBox}
                ref={(el: HTMLSpanElement | null) => { childBoxRefs.current[i] = el; }}
                aria-hidden="true"
              >
                <svg className={styles.cbiSvg} viewBox="0 0 20 20" width={12} height={12}>
                  <path className={styles.cbiCheck} d="M4 10.5l3.5 3.5L16 5.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className={styles.cbiText}>{c.label}</span>
            </label>
          ))}
        </div>
      </div>
    </main>
  );
}
