// NameTagPairSwap — vanilla 판(run/401/demo/01-view-transition-name-pair-swap/index.html) 의 React 포트.
// 카드와 상세 패널에 같은 view-transition-name 값(np-shared)을 그 순간에만 실어 startViewTransition 을 부른다.
import { useEffect, useRef } from "react";
import styles from "./NameTagPairSwap.module.scss";

type Box<T> = { current: T };

const DATA = [
  { b: "A", t: "알파" },
  { b: "B", t: "베타" },
  { b: "C", t: "감마" },
];
const HOLD_MS = 1000;

export default function NameTagPairSwap() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const gridRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const detailRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const cardRefs = useRef([null, null, null]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const badgeRef = useRef(null) as unknown as Box<HTMLElement>;
  const titleRef = useRef(null) as unknown as Box<HTMLElement>;
  const nameRef = useRef(null) as unknown as Box<HTMLElement>;
  const timerRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const SUPPORTS_VT = "startViewTransition" in document;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let opened: number | null = null;

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    // 계산 겹: 이름표 값(view-transition-name)을 그 순간 선택된 카드 하나에만 실어 보낸다 —
    // 모든 카드에 상시 부여하면 이름이 겹쳐 매칭이 깨진다. 값은 매번 새로 계산해서 준다.
    function assignName(id: number, on: boolean) {
      const c = cardRefs.current[id];
      if (c) c.style.viewTransitionName = on ? "np-shared" : "";
    }

    function openRender(id: number) {
      if (opened !== null) assignName(opened, false);
      assignName(id, true);
      const detail = detailRef.current;
      const grid = gridRef.current;
      if (detail) detail.style.viewTransitionName = "np-shared";
      grid?.setAttribute("hidden", "");
      detail?.removeAttribute("hidden");
      if (badgeRef.current) badgeRef.current.textContent = DATA[id].b;
      if (titleRef.current) titleRef.current.textContent = DATA[id].t;
      if (nameRef.current) nameRef.current.textContent = "card-" + id;
      opened = id;
    }

    function closeRender() {
      detailRef.current?.setAttribute("hidden", "");
      gridRef.current?.removeAttribute("hidden");
      if (opened !== null) assignName(opened, false);
      if (detailRef.current) detailRef.current.style.viewTransitionName = "";
      opened = null;
    }

    function change(fn: () => void) {
      if (SUPPORTS_VT) { document.startViewTransition(fn); }
      else { fn(); }
    }

    function open(id: number) {
      if (opened === id) return;
      change(() => openRender(id));
    }
    function close() {
      if (opened === null) return;
      change(closeRender);
    }

    function onCardClick(i: number) { return () => { human(); open(i); }; }
    const clickHandlers = [0, 1, 2].map(onCardClick);
    cardRefs.current.forEach((c, i) => c?.addEventListener("click", clickHandlers[i]));
    function onBackClick() { human(); close(); }
    detailRef.current; // noop keep ref referenced
    const backBtn = rootRef.current?.querySelector<HTMLButtonElement>("[data-back]");
    backBtn?.addEventListener("click", onBackClick);
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") { human(); close(); }
    }
    rootRef.current?.addEventListener("keydown", onKeydown);

    const seq = [0, 1, 2];
    let si = 0;
    function loop() {
      if (!isDemo) return;
      if (opened === null) { open(seq[si % seq.length]); si++; }
      else { close(); }
      timerRef.current = window.setTimeout(loop, HOLD_MS);
    }

    if (!reduce) {
      timerRef.current = window.setTimeout(loop, HOLD_MS);
    } else {
      rootRef.current?.classList.remove(styles.isDemo);
    }

    return () => {
      window.clearTimeout(timerRef.current);
      cardRefs.current.forEach((c, i) => c?.removeEventListener("click", clickHandlers[i]));
      backBtn?.removeEventListener("click", onBackClick);
      rootRef.current?.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.np + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.grid} ref={gridRef}>
          <button type="button" className={styles.card} aria-label="알파 열기" ref={(el: HTMLButtonElement | null) => { cardRefs.current[0] = el; }}>
            <span className={styles.badge}>A</span><span className={styles.t}>알파</span>
          </button>
          <button type="button" className={styles.card} aria-label="베타 열기" ref={(el: HTMLButtonElement | null) => { cardRefs.current[1] = el; }}>
            <span className={styles.badge}>B</span><span className={styles.t}>베타</span>
          </button>
          <button type="button" className={styles.card} aria-label="감마 열기" ref={(el: HTMLButtonElement | null) => { cardRefs.current[2] = el; }}>
            <span className={styles.badge}>C</span><span className={styles.t}>감마</span>
          </button>
        </div>
        <div className={styles.detail} ref={detailRef} hidden>
          <button type="button" className={styles.back} data-back aria-label="목록으로">뒤로</button>
          <span className={styles.badge + " " + styles.badgeLg} ref={badgeRef}>A</span>
          <p className={styles.title} ref={titleRef}>알파</p>
          <p className={styles.desc}>이름표 값 <code ref={nameRef}>card-0</code>로 짝지어졌다</p>
        </div>
      </div>
    </main>
  );
}
