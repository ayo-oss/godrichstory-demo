// CountBadgeRoll — vanilla 판(run/368/demo/04-custom-checkbox-count-badge-roll/index.html) 의 React 포트.
// 체크된 개수 → 목표 translateY 값을 만들고 easeOutCubic 을 rAF 로 직접 적분해 숫자 strip 을
// 다음 칸으로 굴린다. clip-path 가 그 칸 하나만 보이는 창을 만든다.
import { useEffect, useRef } from "react";
import styles from "./CountBadgeRoll.module.scss";

type Box<T> = { current: T };

const ITEMS = [
  { id: "item0", label: "기본 배송" },
  { id: "item1", label: "선물 포장" },
  { id: "item2", label: "설치 서비스" },
];

export default function CountBadgeRoll() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const stripRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const inputRefs = useRef([null, null, null]) as unknown as Box<(HTMLInputElement | null)[]>;
  const boxRefs = useRef([null, null, null]) as unknown as Box<(HTMLSpanElement | null)[]>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const ROW_H = 18; // px, 숫자 롤 한 칸 높이
    let ROLL_MS = 260; // 계산 겹 상수: 숫자가 다음 칸으로 굴러가는 데 걸리는 실제 시간(ms)
    const CYCLE_MS = 560; // 자동 루프가 항목을 하나씩 체크하는 간격
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const root = rootRef.current;
    const strip = stripRef.current;
    const inputs = inputRefs.current;
    const boxes = boxRefs.current;
    if (!root || !strip) return;

    let isDemo = true;
    let pos = 0, from = 0, to = 0, rollStart = 0, rolling = false;

    function human() {
      if (isDemo) { root!.classList.remove(styles.isDemo); isDemo = false; }
    }

    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

    function currentPos(ts: number) {
      if (!rolling) return to;
      const t = Math.min(1, (ts - rollStart) / ROLL_MS);
      return from + (to - from) * easeOutCubic(t);
    }

    function paint(ts: number) {
      inputs.forEach((inp, i) => { boxes[i]?.classList.toggle(styles.boxOn, inp ? inp.checked : false); });
      const count = inputs.filter((i) => i?.checked).length;
      const target = -count * ROW_H;
      if (target !== to) {
        from = currentPos(ts);
        to = target;
        rollStart = ts;
        rolling = true;
      }
    }

    const handlers = inputs.map((inp) => {
      const fn = () => { human(); paint(performance.now()); };
      inp?.addEventListener("change", fn);
      return fn;
    });

    let cycleStart = 0;
    let lastN = -1;
    const SEQ = [
      [false, false, false], [true, false, false], [true, true, false], [true, true, true],
      [true, true, false], [true, false, false], [false, false, false],
    ];

    function loop(ts: number) {
      if (!cycleStart) cycleStart = ts;

      if (isDemo) {
        const n = Math.floor((ts - cycleStart) / CYCLE_MS) % SEQ.length;
        if (n !== lastN) {
          lastN = n;
          const state = SEQ[n];
          inputs.forEach((inp, i) => { if (inp) inp.checked = state[i]; });
          paint(ts);
        }
      }

      pos = currentPos(ts);
      strip!.style.transform = "translateY(" + pos.toFixed(2) + "px)";

      rafRef.current = requestAnimationFrame(loop);
    }

    if (reduce) { ROLL_MS = 1; }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      inputs.forEach((inp, i) => inp?.removeEventListener("change", handlers[i]));
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cbc + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.cbcList}>
          {ITEMS.map((it, i) => (
            <label className={styles.cbcRow} key={it.id}>
              <input
                type="checkbox"
                className={styles.cbcInput}
                ref={(el: HTMLInputElement | null) => { inputRefs.current[i] = el; }}
              />
              <span
                className={styles.cbcBox}
                ref={(el: HTMLSpanElement | null) => { boxRefs.current[i] = el; }}
                aria-hidden="true"
              >
                <svg viewBox="0 0 20 20" width={12} height={12}>
                  <path d="M4 10.5l3.5 3.5L16 5.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className={styles.cbcText}>{it.label}</span>
            </label>
          ))}
        </div>
        <span className={styles.cbcBadge}>
          <span className={styles.cbcWindow}>
            <span className={styles.cbcStrip} ref={stripRef}>
              <span>0</span><span>1</span><span>2</span><span>3</span>
            </span>
          </span>
        </span>
      </div>
    </main>
  );
}
