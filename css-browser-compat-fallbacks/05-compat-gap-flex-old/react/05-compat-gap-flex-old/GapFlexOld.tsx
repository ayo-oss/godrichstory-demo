// GapFlexOld — vanilla 판(run/375/demo/05-compat-gap-flex-old/index.html) 의 React 포트.
// 폴백은 항상 margin-right 로 간격을 주고, @supports(gap) 지원판에서 gap 이 그 역할을 넘겨받는다.
import { useEffect, useRef } from "react";
import styles from "./GapFlexOld.module.scss";

type Box<T> = { current: T };

const STEP_MS = 380; // 자동 추가/삭제 간격

export default function GapFlexOld() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const chipRowRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const addInputRef = useRef(null) as unknown as Box<HTMLInputElement>;
  const simToggleRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const modeLabelRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = rootRef.current;
    const chipRow = chipRowRef.current;
    const addInput = addInputRef.current;
    const simToggle = simToggleRef.current;
    const modeLabel = modeLabelRef.current;
    if (!wrap || !chipRow || !addInput || !simToggle || !modeLabel) return;

    let isDemo = true;

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }

    let seq = 0;
    function addChip(text: string) {
      const li = document.createElement("li");
      li.className = styles.chip + " " + styles.isEntering;
      li.textContent = text;
      li.style.setProperty("--i", String(seq % 6));
      seq += 1;
      li.addEventListener("click", function () { human(); removeChip(li); });
      chipRow!.appendChild(li);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { li.classList.remove(styles.isEntering); });
      });
    }

    function removeChip(li: Element | null) {
      if (!li || li.classList.contains(styles.isLeaving)) return;
      li.classList.add(styles.isLeaving);
      li.addEventListener("transitionend", function () { (li as HTMLElement).remove(); }, { once: true });
    }

    function onKeydown(e: KeyboardEvent) {
      if (e.key !== "Enter") return;
      human();
      const value = addInput!.value.trim();
      if (value) { addChip(value); addInput!.value = ""; }
    }
    addInput.addEventListener("keydown", onKeydown);

    let simOn = false;
    function setSim(on: boolean) {
      simOn = on;
      wrap!.classList.toggle(styles.forceFallback, on);
      simToggle!.setAttribute("aria-pressed", String(on));
      modeLabel!.textContent = on ? "margin 폴백판" : "gap 지원판";
    }
    function onSimClick() { human(); setSim(!simOn); }
    simToggle.addEventListener("click", onSimClick);

    const WORDS = ["정렬", "간격", "규칙", "토큰", "흐름"];
    let wi = 0;
    let last = 0;
    let phase = 0;
    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo && !reduce && ts - last >= STEP_MS) {
        last = ts;
        phase = (phase + 1) % 3;
        if (phase === 0) {
          addChip(WORDS[wi % WORDS.length]);
          wi += 1;
        } else if (phase === 1 && chipRow!.children.length > 2) {
          removeChip(chipRow!.lastElementChild);
        } else {
          setSim(!simOn);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      addInput!.removeEventListener("keydown", onKeydown);
      simToggle!.removeEventListener("click", onSimClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.head}>
          <input className={styles.addInput} ref={addInputRef} type="text" placeholder="태그 입력 후 Enter" maxLength={8} />
          <button className={styles.simToggle} ref={simToggleRef} type="button" aria-pressed="false">폴백 흉내내기</button>
        </div>
        <ul className={styles.chipRow} ref={chipRowRef}>
          <li className={styles.chip}>여백</li>
          <li className={styles.chip}>토큰</li>
          <li className={styles.chip}>정렬</li>
        </ul>
        <span className={styles.modeLabel} ref={modeLabelRef}>gap 지원판</span>
      </div>
    </main>
  );
}
