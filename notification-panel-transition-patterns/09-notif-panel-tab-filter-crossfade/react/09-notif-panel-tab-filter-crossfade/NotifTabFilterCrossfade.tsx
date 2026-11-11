// NotifTabFilterCrossfade — vanilla 판(run/405/demo/09-.../index.html) 의 React 포트.
// 계산 겹: 필터 결과 값(항목 수)에 따라 목록을 채운 뒤, 이전 목록은 위로 이동하며(opacity·
// translateY 를 함께) 빠지고 새 목록은 아래에서 올라오며 들어온다 — 두 층을 번갈아 앞뒤로
// 써서 front/back 역할은 JS 변수로만 바꾸고(정적 CSS 클래스로 고정하지 않는다 — 항목 07 과
// 달리 여기선 두 DOM 노드가 역할을 서로 바꿔 끼우므로 인라인 스타일로 관리해야 한다).
import { useEffect, useRef, useState } from "react";
import styles from "./NotifTabFilterCrossfade.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type Cat = "all" | "mention" | "system";

type Item = { name: string; cat: Exclude<Cat, "all"> };
const ITEMS: Item[] = [
  { name: "결제가 승인됐어요", cat: "system" },
  { name: "지수 님이 회원님을 언급했어요", cat: "mention" },
  { name: "회의 10분 전이에요", cat: "system" },
  { name: "우진 님이 댓글에서 멘션했어요", cat: "mention" },
  { name: "업로드가 끝났어요", cat: "system" },
  { name: "하은 님이 답글을 남겼어요", cat: "mention" },
];
const CATS: Cat[] = ["all", "mention", "system"];
const LABEL: { [k in Cat]: string } = { all: "전체", mention: "멘션", system: "시스템" };

export default function NotifTabFilterCrossfade() {
  const [isDemo, setIsDemo] = useState(true);
  const [active, setActive] = useState<Cat>("all");

  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const synthRef = useRef(false) as unknown as Box<boolean>;
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const tabRefs = {
    all: useRef(null) as unknown as Box<HTMLButtonElement>,
    mention: useRef(null) as unknown as Box<HTMLButtonElement>,
    system: useRef(null) as unknown as Box<HTMLButtonElement>,
  };
  const listARef = useRef(null) as unknown as Box<HTMLUListElement>;
  const listBRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const srRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const frontRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const backRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const activeRef = useRef<Cat>("all") as unknown as Box<Cat>;
  const reduceRef = useRef(false) as unknown as Box<boolean>;
  const loopTimerRef = useRef(0) as unknown as Box<number>;
  const swapTimerRef = useRef(0) as unknown as Box<number>;

  function human() {
    if (synthRef.current) return;
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function makeRow(name: string): HTMLLIElement {
    const li = document.createElement("li");
    li.className = styles.item;
    li.setAttribute("role", "listitem");
    li.textContent = name;
    return li;
  }

  function fill(el: HTMLUListElement, cat: Cat): number {
    el.innerHTML = "";
    const rows = cat === "all" ? ITEMS : ITEMS.filter((it) => it.cat === cat);
    rows.forEach((it) => { el.appendChild(makeRow(it.name)); });
    return rows.length;
  }

  function selectTab(cat: Cat, viaKeyboard: boolean) {
    if (cat === activeRef.current) return;
    const reduce = reduceRef.current;
    const incoming = backRef.current, outgoing = frontRef.current;
    if (!incoming || !outgoing) return;
    const n = fill(incoming, cat);
    incoming.style.transition = "none";
    incoming.style.opacity = "0";
    incoming.style.transform = "translateY(12px)";
    incoming.removeAttribute("hidden");
    void incoming.offsetHeight;
    incoming.style.transition = "";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        outgoing.classList.add(styles.listOut);
        incoming.style.opacity = "1";
        incoming.style.transform = "translateY(0)";
      });
    });
    window.clearTimeout(swapTimerRef.current);
    swapTimerRef.current = window.setTimeout(() => {
      outgoing.setAttribute("hidden", "");
      outgoing.classList.remove(styles.listOut);
      outgoing.style.opacity = "";
      outgoing.style.transform = "";
      incoming.style.opacity = "";
      incoming.style.transform = "";
      frontRef.current = incoming;
      backRef.current = outgoing;
    }, reduce ? 0 : 260);
    activeRef.current = cat;
    setActive(cat);
    if (srRef.current) srRef.current.textContent = LABEL[cat] + " " + n + "건";
    if (viaKeyboard) {
      const el = tabRefs[cat].current;
      if (el) el.focus({ preventScroll: true });
    }
  }

  function onTabClick(cat: Cat) {
    human();
    selectTab(cat, false);
  }

  function onTabsKeyDown(e: KeyEvt) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    human();
    const idx = CATS.indexOf(activeRef.current);
    const next = e.key === "ArrowRight" ? (idx + 1) % CATS.length : (idx - 1 + CATS.length) % CATS.length;
    e.preventDefault();
    selectTab(CATS[next], true);
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reduceRef.current = reduce;
    frontRef.current = listARef.current;
    backRef.current = listBRef.current;
    const front = frontRef.current;
    if (!front) return;
    fill(front, "all");
    if (srRef.current) srRef.current.textContent = LABEL.all + " " + ITEMS.length + "건";

    if (reduce) {
      // 정지 상태만 보인다 — 전환 없이 탭 값만 최종으로 확정
    } else {
      let idx = 0;
      function loop() {
        if (!isDemoRef.current) return;
        synthRef.current = true;
        idx = (idx + 1) % CATS.length;
        selectTab(CATS[idx], false);
        synthRef.current = false;
        loopTimerRef.current = window.setTimeout(loop, 1500);
      }
      loopTimerRef.current = window.setTimeout(loop, 800);
    }

    return () => { window.clearTimeout(loopTimerRef.current); window.clearTimeout(swapTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.tf + " " + (isDemo ? styles.isDemo : "")} ref={rootRef}>
        <div className={styles.tabs} role="tablist" aria-label="알림 종류" onKeyDown={onTabsKeyDown}>
          <button className={styles.tab} role="tab" type="button" aria-selected={active === "all"}
                  aria-controls="tfBody" tabIndex={active === "all" ? 0 : -1} ref={tabRefs.all}
                  onClick={() => onTabClick("all")}>전체</button>
          <button className={styles.tab} role="tab" type="button" aria-selected={active === "mention"}
                  aria-controls="tfBody" tabIndex={active === "mention" ? 0 : -1} ref={tabRefs.mention}
                  onClick={() => onTabClick("mention")}>멘션</button>
          <button className={styles.tab} role="tab" type="button" aria-selected={active === "system"}
                  aria-controls="tfBody" tabIndex={active === "system" ? 0 : -1} ref={tabRefs.system}
                  onClick={() => onTabClick("system")}>시스템</button>
        </div>
        <div className={styles.body} id="tfBody" role="tabpanel">
          <ul className={styles.list} role="list" ref={listARef} />
          <ul className={styles.list} role="list" ref={listBRef} hidden />
        </div>
        <p className={styles.sr} aria-live="polite" ref={srRef} />
      </div>
    </main>
  );
}
