// EmojiCategoryIndexScrollSync — vanilla 판(run/402/demo/02-.../index.html) 의 React 포트.
// onScroll() 이 패널의 scrollTop(지나간 거리 값)을 섹션 오프셋과 비교해 카테고리 번호를 역산하고,
// goTo() 는 반대로 그 번호 값으로 패널을 스크롤한다 — 둘은 항상 같은 자리를 가리킨다.
import { useEffect, useRef, useState } from "react";
import styles from "./EmojiCategoryIndexScrollSync.module.scss";

type Box<T> = { current: T };

type Cat = { id: string; name: string; emoji: string[] };
const CATS: Cat[] = [
  { id: "smiley", name: "표정", emoji: ["\u{1F600}", "\u{1F603}", "\u{1F604}", "\u{1F601}"] },
  { id: "gesture", name: "손짓", emoji: ["\u{1F44D}", "\u{1F44E}", "\u{1F44B}", "\u{1F91D}"] },
  { id: "nature", name: "자연", emoji: ["\u{1F338}", "\u{1F319}", "\u{2B50}", "\u{1F308}"] },
  { id: "food", name: "음식", emoji: ["\u{1F355}", "\u{1F354}", "\u{1F369}", "\u{1F34E}"] },
];
const SEQ = [1, 2, 3, 0, 2];

export default function EmojiCategoryIndexScrollSync() {
  const [active, setActiveState] = useState(0);
  const [isDemo, setIsDemo] = useState(true);
  const [live, setLive] = useState("");
  const [ind, setInd] = useState({ w: 0, x: 0 });

  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const syncingRef = useRef(false) as unknown as Box<boolean>;
  const activeRef = useRef(0) as unknown as Box<number>;
  const timerRef = useRef(0) as unknown as Box<number>;
  const tabsRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const tabRefs = useRef([] as HTMLButtonElement[]) as unknown as Box<HTMLButtonElement[]>;
  const panelRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const secRefs = useRef([] as HTMLDivElement[]) as unknown as Box<HTMLDivElement[]>;

  function human() { if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); } }

  function measureInd(i: number) {
    const tab = tabRefs.current[i], wrap = tabsRef.current;
    if (!tab || !wrap) return;
    const r = tab.getBoundingClientRect(), pr = wrap.getBoundingClientRect();
    setInd({ w: r.width, x: r.left - pr.left });
  }

  function setActive(i: number) {
    activeRef.current = i;
    setActiveState(i);
    measureInd(i);
  }

  function goTo(i: number, silent: boolean) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const panel = panelRef.current, sec = secRefs.current[i];
    if (panel && sec) {
      syncingRef.current = true;
      panel.scrollTo({ top: sec.offsetTop - panel.clientTop, behavior: reduce ? "auto" : "smooth" });
      window.setTimeout(() => { syncingRef.current = false; }, reduce ? 30 : 420);
    }
    setActive(i);
    if (!silent) setLive(CATS[i].name + " 카테고리로 이동");
  }

  function onScroll() {
    human();
    if (syncingRef.current) return;
    const panel = panelRef.current;
    if (!panel) return;
    const dist = panel.scrollTop;
    let i = 0;
    for (let k = 0; k < secRefs.current.length; k++) {
      const sec = secRefs.current[k];
      if (sec && sec.offsetTop - panel.clientTop <= dist + 18) i = k;
    }
    if (i !== activeRef.current) { setActive(i); setLive(CATS[i].name + " 카테고리 보임"); }
  }

  useEffect(() => {
    measureInd(0);
    const onResize = () => measureInd(activeRef.current);
    window.addEventListener("resize", onResize);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0;
    function loop() {
      if (!isDemoRef.current) return;
      goTo(SEQ[i % SEQ.length], true);
      i++;
      timerRef.current = window.setTimeout(loop, 780);
    }
    if (!reduce) { timerRef.current = window.setTimeout(loop, 500); }
    else { isDemoRef.current = false; setIsDemo(false); }
    return () => { window.removeEventListener("resize", onResize); window.clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cx + " " + (isDemo ? styles.isDemo : "")}>
        <div className={styles.tabs} role="tablist" aria-label="이모지 카테고리" ref={tabsRef}>
          <span className={styles.ind} aria-hidden="true" style={{ width: ind.w, transform: "translateX(" + ind.x + "px)" }} />
          {CATS.map((cat, i) => (
            <button key={cat.id} type="button" className={styles.tab} id={"cxTab" + i} role="tab"
                    aria-selected={active === i} aria-controls={"cxSec" + i}
                    ref={(el: HTMLButtonElement | null) => { if (el) tabRefs.current[i] = el; }}
                    onClick={() => { human(); goTo(i, false); }}>{cat.name}</button>
          ))}
        </div>
        <div className={styles.panel} tabIndex={0} aria-label="이모지 패널" ref={panelRef} onScroll={onScroll}>
          {CATS.map((cat, i) => (
            <section key={cat.id} className={styles.section} id={"cxSec" + i} role="region" aria-labelledby={"cxTab" + i}
                     ref={(el: HTMLDivElement | null) => { if (el) secRefs.current[i] = el; }}>
              <h3 className={styles.h}>{cat.name}</h3>
              <div className={styles.grid} role="listbox" aria-label={cat.name}>
                {cat.emoji.map((ch, j) => (
                  <button key={j} type="button" className={styles.ch} role="option" aria-selected="false">{ch}</button>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className={styles.sr} role="status" aria-live="polite">{live}</p>
      </div>
    </main>
  );
}
