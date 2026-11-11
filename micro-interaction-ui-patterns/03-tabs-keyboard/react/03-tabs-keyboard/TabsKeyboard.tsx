import { useEffect, useRef, useState } from "react";
import styles from "./TabsKeyboard.module.scss";

// 키보드 탭 — 탭이 바뀔 때마다 실제 렌더 위치·폭을 getBoundingClientRect 로 다시 재서 밑줄 이동 값을 만든다.
// 계산 겹: 화면 밖 탭은 같은 실측으로 스크롤 값도 계산한다. 실사용 click/keydown 리스너 있음.
const LABELS = ["일반", "알림", "보안", "고급 옵션"];
const TEXTS = ["일반 설정 내용", "알림 설정 내용", "보안 설정 내용", "고급 옵션 내용"];

export default function TabsKeyboard() {
  const rootRef = useRef<HTMLDivElement>(null);
  const tabsElRef = useRef<HTMLDivElement>(null);
  const underlineRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [index, setIndexState] = useState(0);
  const indexRef = useRef(0);
  const autoplayRef = useRef<number | null>(null);

  function place(i: number) {
    const tabsEl = tabsElRef.current;
    const underline = underlineRef.current;
    const tab = (tabRefs.current ?? [])[i];
    if (!tabsEl || !underline || !tab) return;
    const containerRect = tabsEl.getBoundingClientRect();
    const rect = tab.getBoundingClientRect();
    const x = rect.left - containerRect.left + tabsEl.scrollLeft;
    const w = rect.width;
    underline.style.setProperty("--x", x.toFixed(1) + "px");
    underline.style.setProperty("--w", w.toFixed(1) + "px");
    const left = x;
    const right = x + w;
    if (left < tabsEl.scrollLeft) { tabsEl.scrollLeft = left; }
    else if (right > tabsEl.scrollLeft + tabsEl.clientWidth) { tabsEl.scrollLeft = right - tabsEl.clientWidth; }
  }

  function select(i: number) {
    const len = LABELS.length;
    const next = ((i % len) + len) % len;
    indexRef.current = next;
    setIndexState(next);
    window.setTimeout(() => place(next), 0);
  }

  function stopAutoplay() {
    if (autoplayRef.current) {
      window.clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }

  useEffect(() => {
    place(0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      autoplayRef.current = window.setInterval(() => select((indexRef.current ?? 0) + 1), 480);
    }
    return () => stopAutoplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    rootRef.current?.classList.remove(styles["is-demo"]);
    stopAutoplay();
    if (e.key === "ArrowRight") select((indexRef.current ?? 0) + 1);
    if (e.key === "ArrowLeft") select((indexRef.current ?? 0) - 1);
    if (e.key === "Home") select(0);
    if (e.key === "End") select(LABELS.length - 1);
    (tabRefs.current ?? [])[indexRef.current ?? 0]?.focus({ preventScroll: true });
  }

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.tk} ${styles["is-demo"]}`}>
        <div ref={tabsElRef} className={styles.tk__tabs} role="tablist" aria-label="설정 카테고리" onKeyDown={onKeyDown}>
          <div ref={underlineRef} className={styles.tk__underline} aria-hidden="true" />
          {LABELS.map((label, i) => (
            <button
              key={label}
              ref={(el: HTMLButtonElement | null) => { if (tabRefs.current) tabRefs.current[i] = el; }}
              className={styles.tk__tab}
              role="tab"
              type="button"
              tabIndex={i === index ? 0 : -1}
              aria-selected={i === index}
              onClick={() => {
                rootRef.current?.classList.remove(styles["is-demo"]);
                stopAutoplay();
                select(i);
                (tabRefs.current ?? [])[i]?.focus({ preventScroll: true });
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p className={styles.tk__panel}>{TEXTS[index]}</p>
      </div>
    </main>
  );
}
