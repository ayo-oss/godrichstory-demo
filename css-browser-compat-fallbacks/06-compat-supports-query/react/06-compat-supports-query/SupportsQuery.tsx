// SupportsQuery — vanilla 판(run/375/demo/06-compat-supports-query/index.html) 의 React 포트.
// CSS.supports() 로 실제 렌더 환경을 검사해 항목별 지원/미지원을 표시하고, 통과 비율을 막대 scaleX 로 잰다.
import { useEffect, useRef } from "react";
import styles from "./SupportsQuery.module.scss";

type Box<T> = { current: T };

const STEP_MS = 620; // 자동 재검사/시뮬레이션 간격

export default function SupportsQuery() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const checkListRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const barFillRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const rescanBtnRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const simToggleRef = useRef(null) as unknown as Box<HTMLButtonElement>;
  const modeLabelRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const rafRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wrap = rootRef.current;
    const checkList = checkListRef.current;
    const barFill = barFillRef.current;
    const rescanBtn = rescanBtnRef.current;
    const simToggle = simToggleRef.current;
    const modeLabel = modeLabelRef.current;
    if (!wrap || !checkList || !barFill || !rescanBtn || !simToggle || !modeLabel) return;

    let isDemo = true;

    function human() { if (isDemo) { wrap!.classList.remove(styles.isDemo); isDemo = false; } }

    // 실제 @supports 와 같은 판정 근거 — CSS.supports() 로 지금 렌더 환경을 그대로 검사한다
    const FEATURES = [
      { label: "플렉스 gap", test: function () { return CSS.supports("gap", "1px"); } },
      { label: "가로세로비", test: function () { return CSS.supports("aspect-ratio", "1 / 1"); } },
      { label: "배경 흐림", test: function () { return CSS.supports("backdrop-filter", "blur(1px)"); } },
      { label: "부모 선택자", test: function () { return CSS.supports("selector(:has(a))"); } },
      { label: "컨테이너 쿼리", test: function () { return CSS.supports("container-type", "inline-size"); } }
    ];

    let simOn = false;
    let rows: { el: HTMLLIElement; icon: HTMLSpanElement; ok: boolean }[] = [];

    function build() {
      checkList!.innerHTML = "";
      rows = FEATURES.map(function (f, i) {
        const li = document.createElement("li");
        li.className = styles.checkRow + " " + styles.isHidden;
        li.style.setProperty("--i", String(i));
        const icon = document.createElement("span");
        icon.className = styles.statusIcon;
        const name = document.createElement("span");
        name.className = styles.featureName;
        name.textContent = f.label;
        li.appendChild(icon);
        li.appendChild(name);
        checkList!.appendChild(li);
        return { el: li, icon: icon, ok: f.test() };
      });
    }
    build();

    function hideAll() {
      rows.forEach(function (row) { row.el.classList.add(styles.isHidden); row.el.classList.remove(styles.isRevealed); });
    }

    function scan() {
      let okCount = 0;
      rows.forEach(function (row, i) {
        // 시뮬레이션판: 실제 결과 위에 강제로 미지원을 덧씌워 폴백 문구가 보이게 한다(감지 흉내가 아니라 표시 전용 오버라이드)
        const displayOk = simOn ? (row.ok && i % 2 === 0) : row.ok;
        row.el.classList.toggle(styles.isOk, displayOk);
        row.el.classList.toggle(styles.isFallback, !displayOk);
        row.el.classList.remove(styles.isHidden);
        row.el.classList.add(styles.isRevealed);
        if (displayOk) okCount += 1;
      });
      const ratio = rows.length ? okCount / rows.length : 0;
      barFill!.style.transform = "scaleX(" + ratio + ")";
      modeLabel!.textContent = simOn ? "폴백 흉내 검사" : "실제 지원 검사";
    }

    function onRescan() {
      human();
      hideAll();
      requestAnimationFrame(function () { requestAnimationFrame(scan); });
    }
    rescanBtn.addEventListener("click", onRescan);

    function setSim(on: boolean) {
      simOn = on;
      simToggle!.setAttribute("aria-pressed", String(on));
      scan();
    }
    function onSimClick() { human(); setSim(!simOn); }
    simToggle.addEventListener("click", onSimClick);

    scan();

    let last = 0;
    let phase = 0;
    function loop(ts: number) {
      if (!last) last = ts;
      if (isDemo && !reduce && ts - last >= STEP_MS) {
        last = ts;
        phase = (phase + 1) % 3;
        if (phase === 0) {
          hideAll();
        } else if (phase === 1) {
          scan();
        } else {
          setSim(!simOn);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      rescanBtn!.removeEventListener("click", onRescan);
      simToggle!.removeEventListener("click", onSimClick);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.wrap + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.head}>
          <span className={styles.modeLabel} ref={modeLabelRef}>실제 지원 검사</span>
          <button className={styles.rescanBtn} ref={rescanBtnRef} type="button">다시 검사</button>
        </div>
        <ul className={styles.checkList} ref={checkListRef}></ul>
        <div className={styles.bar}><div className={styles.barFill} ref={barFillRef}></div></div>
        <button className={styles.simToggle} ref={simToggleRef} type="button" aria-pressed="false">폴백 흉내내기</button>
      </div>
    </main>
  );
}
