// NotifGroupHeaderCollapse — vanilla 판(run/405/demo/02-.../index.html) 의 React 포트.
// 계산 겹: 항목마다 실제 높이를 getBoundingClientRect 로 재고, 순번(index) x
// NOTIF_GROUP_COLLAPSE_DELAY_MS 를 transitionDelay 로 걸어 위에서 아래로(펼 때는 아래에서
// 위로) 순서대로 접히고 펼쳐지는 계단식 흐름을 만든다 — vanilla 와 동일 동작.
import { useEffect, useRef, useState } from "react";
import styles from "./NotifGroupHeaderCollapse.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type GroupKey = "today" | "yesterday";

const NOTIF_GROUP_COLLAPSE_DELAY_MS = 80; // 항목마다 접히는 시작 시각이 이 값 x 순번만큼 밀린다

const GROUPS: { [k in GroupKey]: string[] } = {
  today: ["결제가 승인됐어요", "새 댓글이 달렸어요", "회의 10분 전이에요"],
  yesterday: ["업로드가 끝났어요", "초대장이 도착했어요"],
};

export default function NotifGroupHeaderCollapse() {
  const [isDemo, setIsDemo] = useState(true);
  const [expanded, setExpanded] = useState<{ [k in GroupKey]: boolean }>({ today: true, yesterday: true });

  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const synthRef = useRef(false) as unknown as Box<boolean>;
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const headerRef = {
    today: useRef(null) as unknown as Box<HTMLButtonElement>,
    yesterday: useRef(null) as unknown as Box<HTMLButtonElement>,
  };
  const listRef = {
    today: useRef(null) as unknown as Box<HTMLUListElement>,
    yesterday: useRef(null) as unknown as Box<HTMLUListElement>,
  };
  const stateRef = useRef({ today: true, yesterday: true }) as unknown as Box<{ [k in GroupKey]: boolean }>;
  const loopTimerRef = useRef(0) as unknown as Box<number>;
  const stepRef = useRef(0) as unknown as Box<number>;

  function human() {
    if (synthRef.current) return;
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function buildList(key: GroupKey) {
    const ul = listRef[key].current;
    if (!ul) return;
    ul.innerHTML = "";
    GROUPS[key].forEach((name) => {
      const li = document.createElement("li");
      li.className = styles.item;
      li.setAttribute("role", "listitem");
      li.textContent = name;
      ul.appendChild(li);
    });
  }

  function setGroup(key: GroupKey, expand: boolean, reduce: boolean) {
    stateRef.current[key] = expand;
    setExpanded((prev) => ({ ...prev, [key]: expand }));
    const list = listRef[key].current;
    if (!list) return;
    const items = Array.prototype.slice.call(list.children) as HTMLLIElement[];
    const n = items.length;
    items.forEach((li, i) => {
      const order = expand ? n - 1 - i : i;
      const delay = reduce ? 0 : order * NOTIF_GROUP_COLLAPSE_DELAY_MS;
      let h = li.dataset.h ? parseFloat(li.dataset.h) : null;
      if (h === null) {
        li.style.height = "auto";
        h = li.getBoundingClientRect().height;
        li.dataset.h = String(h);
      }
      li.style.transitionDelay = delay + "ms";
      if (expand) {
        li.style.height = "0px";
        li.style.opacity = "0";
        requestAnimationFrame(() => { li.style.height = h + "px"; li.style.opacity = "1"; });
      } else {
        li.style.height = h + "px";
        li.style.opacity = "1";
        requestAnimationFrame(() => { li.style.height = "0px"; li.style.opacity = "0"; });
      }
    });
  }

  function toggleGroup(key: GroupKey) {
    human();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setGroup(key, !stateRef.current[key], reduce);
  }

  function onKeyDown(key: GroupKey, e: KeyEvt) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleGroup(key);
    }
  }

  useEffect(() => {
    buildList("today");
    buildList("yesterday");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function onResize() {
      const root = rootRef.current;
      if (!root) return;
      Array.prototype.forEach.call(root.querySelectorAll("li"), (li: HTMLLIElement) => { delete li.dataset.h; });
    }
    window.addEventListener("resize", onResize);

    if (reduce) {
      setGroup("today", false, true);
    } else {
      function loop() {
        if (!isDemoRef.current) return;
        synthRef.current = true;
        const step = stepRef.current;
        if (step === 0) setGroup("today", false, false);
        else if (step === 1) setGroup("today", true, false);
        else if (step === 2) setGroup("yesterday", false, false);
        else setGroup("yesterday", true, false);
        synthRef.current = false;
        stepRef.current = (step + 1) % 4;
        loopTimerRef.current = window.setTimeout(loop, 1500);
      }
      loopTimerRef.current = window.setTimeout(loop, 500);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(loopTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.gh + " " + (isDemo ? styles.isDemo : "")} ref={rootRef}>
        <section className={styles.group}>
          <button className={styles.header} type="button" aria-expanded={expanded.today ? "true" : "false"}
                  aria-controls="ghListToday" ref={headerRef.today}
                  onClick={() => toggleGroup("today")} onKeyDown={(e: KeyEvt) => onKeyDown("today", e)}>
            <svg className={styles.caret} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
              <path d="m208 96l-80 80l-80-80Z" opacity=".2" />
              <path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" />
            </svg>
            <span className={styles.headerLabel}>오늘 · {GROUPS.today.length}</span>
          </button>
          <ul className={styles.list} id="ghListToday" role="list" ref={listRef.today} />
        </section>
        <section className={styles.group}>
          <button className={styles.header} type="button" aria-expanded={expanded.yesterday ? "true" : "false"}
                  aria-controls="ghListYesterday" ref={headerRef.yesterday}
                  onClick={() => toggleGroup("yesterday")} onKeyDown={(e: KeyEvt) => onKeyDown("yesterday", e)}>
            <svg className={styles.caret} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
              <path d="m208 96l-80 80l-80-80Z" opacity=".2" />
              <path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" />
            </svg>
            <span className={styles.headerLabel}>어제 · {GROUPS.yesterday.length}</span>
          </button>
          <ul className={styles.list} id="ghListYesterday" role="list" ref={listRef.yesterday} />
        </section>
      </div>
    </main>
  );
}
