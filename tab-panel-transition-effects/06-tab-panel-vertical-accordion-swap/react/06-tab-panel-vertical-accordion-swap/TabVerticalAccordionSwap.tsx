// TabVerticalAccordionSwap — vanilla 판(run/394/demo/06-tab-panel-vertical-accordion-swap/index.html) 의 React 포트.
// measure() 가 콘텐츠의 scrollHeight(px) 를 실측해 openPanel() 이 max-height 목표값으로 쓴다.
// 선택 안 된 패널은 max-height:0 으로 접힌다(transition-suppress 로 초기 펼침은 즉시 처리).
import { useEffect, useRef } from "react";
import styles from "./TabVerticalAccordionSwap.module.scss";

type Box<T> = { current: T };

const HOLD_MS = 900;
const COUNT = 3;

export default function TabVerticalAccordionSwap() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const hEl = useRef(null) as unknown as Box<HTMLElement>;
  const tabRefs = useRef([null, null, null]) as unknown as Box<(HTMLButtonElement | null)[]>;
  const panelRefs = useRef([null, null, null]) as unknown as Box<(HTMLDivElement | null)[]>;
  const innerRefs = useRef([null, null, null]) as unknown as Box<(HTMLDivElement | null)[]>;
  const timerRef = useRef(0) as unknown as Box<number>;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;
    let active = 0;

    function human() {
      if (isDemo) { rootRef.current?.classList.remove(styles.isDemo); isDemo = false; }
    }

    function measure(i: number) {
      const inner = innerRefs.current[i];
      return inner ? inner.scrollHeight : 0; // 계산 겹: 콘텐츠 실측 높이(px)
    }

    function onCollapseEnd(e: TransitionEvent) {
      if (e.propertyName !== "max-height") return;
      const el = e.currentTarget as HTMLDivElement;
      if (el.style.maxHeight === "0px") el.setAttribute("hidden", "");
    }

    function openPanel(i: number, instant?: boolean) {
      const el = panelRefs.current[i];
      if (!el) return;
      el.removeAttribute("hidden");
      const h = measure(i);
      if (instant) el.style.transition = "none";
      el.style.maxHeight = h + "px";
      if (instant) { el.getBoundingClientRect(); el.style.transition = ""; }
      if (hEl.current) hEl.current.textContent = String(h);
    }

    function closePanel(i: number) {
      const el = panelRefs.current[i];
      if (!el) return;
      el.style.maxHeight = "0px";
    }

    function select(idx: number) {
      if (idx === active) return;
      closePanel(active);
      openPanel(idx);
      const prevTab = tabRefs.current[active], nextTab = tabRefs.current[idx];
      prevTab?.classList.remove(styles.isActive);
      prevTab?.setAttribute("aria-selected", "false");
      prevTab?.setAttribute("tabindex", "-1");
      nextTab?.classList.add(styles.isActive);
      nextTab?.setAttribute("aria-selected", "true");
      nextTab?.setAttribute("tabindex", "0");
      active = idx;
    }

    function onKeydown(e: KeyboardEvent) {
      const idx = tabRefs.current.indexOf(document.activeElement as HTMLButtonElement);
      if (idx === -1) return;
      let next: number | null = null;
      if (e.key === "ArrowRight") next = (idx + 1) % COUNT;
      else if (e.key === "ArrowLeft") next = (idx - 1 + COUNT) % COUNT;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = COUNT - 1;
      if (next === null) return;
      e.preventDefault();
      human();
      tabRefs.current[next]?.focus({ preventScroll: true });
      select(next);
    }

    function onResize() {
      // 계산 겹: 폭이 바뀌면 줄바꿈이 바뀌어 실측 높이도 바뀐다 — 열린 패널만 재측정해 반영
      const h = measure(active);
      const el = panelRefs.current[active];
      if (el) el.style.maxHeight = h + "px";
      if (hEl.current) hEl.current.textContent = String(h);
    }

    function onTabClick(i: number) { return () => { human(); select(i); }; }
    const clickHandlers = [0, 1, 2].map(onTabClick);
    tabRefs.current.forEach((t, i) => t?.addEventListener("click", clickHandlers[i]));
    rootRef.current?.addEventListener("keydown", onKeydown);
    panelRefs.current.forEach((p) => p?.addEventListener("transitionend", onCollapseEnd as EventListener));
    window.addEventListener("resize", onResize);

    openPanel(0, true);

    function loop() {
      if (!isDemo) return;
      select((active + 1) % COUNT);
      timerRef.current = window.setTimeout(loop, HOLD_MS);
    }

    if (!reduce) {
      timerRef.current = window.setTimeout(loop, HOLD_MS);
    } else {
      rootRef.current?.classList.remove(styles.isDemo);
    }

    return () => {
      window.clearTimeout(timerRef.current);
      window.removeEventListener("resize", onResize);
      tabRefs.current.forEach((t, i) => t?.removeEventListener("click", clickHandlers[i]));
      rootRef.current?.removeEventListener("keydown", onKeydown);
      panelRefs.current.forEach((p) => p?.removeEventListener("transitionend", onCollapseEnd as EventListener));
    };
  }, []);

  const faqs = [
    { name: "배송", q: "배송은 얼마나 걸리나요?", a: "주문 확인 후 1~2영업일 안에 출고되며, 평균 도착까지 2~4일이 걸립니다. 출고 뒤에는 문자로 송장 번호를 안내합니다." },
    { name: "환불", q: "환불은 어떻게 하나요?", a: "수령일 기준 7일 이내 신청하면 됩니다. 포장을 개봉하지 않은 상태라면 왕복 배송비 없이 전액 환불되며, 개봉한 경우에도 하자 확인 뒤 부분 환불이 가능합니다. 신청 뒤 처리까지 평균 3일이 걸립니다." },
    { name: "문의", q: "문의는 어디로 남기나요?", a: "고객센터 채팅으로 남겨주세요. 평일 오전 9시부터 오후 6시까지 순서대로 답변합니다." },
  ];

  return (
    <main className={styles.stage}>
      <div className={styles.va + " " + styles.isDemo} ref={rootRef}>
        <div className={styles.tabs} role="tablist" aria-label="FAQ 탭">
          {faqs.map((f, i) => (
            <button
              key={f.name}
              type="button"
              className={styles.tab + (i === 0 ? " " + styles.isActive : "")}
              role="tab"
              aria-selected={i === 0 ? "true" : "false"}
              tabIndex={i === 0 ? 0 : -1}
              ref={(el: HTMLButtonElement | null) => { tabRefs.current[i] = el; }}
            >{f.name}</button>
          ))}
        </div>
        <div className={styles.list}>
          {faqs.map((f, i) => (
            <div
              key={f.name}
              className={styles.panel}
              role="tabpanel"
              tabIndex={0}
              hidden={i !== 0}
              ref={(el: HTMLDivElement | null) => { panelRefs.current[i] = el; }}
            >
              <div className={styles.inner} ref={(el: HTMLDivElement | null) => { innerRefs.current[i] = el; }}>
                <p className={styles.q}>{f.q}</p>
                <p className={styles.a}>{f.a}</p>
              </div>
            </div>
          ))}
        </div>
        <p className={styles.meta}>
          실측 높이 <b ref={hEl}>0</b>px
        </p>
      </div>
    </main>
  );
}
