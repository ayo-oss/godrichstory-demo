import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./AnchorScrollPreserve.module.scss";

// 스크롤 위치 고정 — loadOlder() 가 위에 추가된 높이 값(scrollHeight 차이)을 계산해
// scrollTop 에 더한다. 앵커 기준 행은 화면에서 밀리지 않고 제자리에 남는다.
const OLDER_BATCH = 4;
const LOAD_DELAY_MS = 560;
const MAX_BATCHES = 3;

export default function AnchorScrollPreserve() {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLLIElement>(null);
  const [count, setCount] = useState(30);
  const [correction, setCorrection] = useState("보정 0px");
  const loadingRef = useRef(false);
  const batchesRef = useRef(0);
  const dirRef = useRef(1);
  const autoplayRef = useRef<number | null>(null);
  const countRef = useRef(30);
  countRef.current = count;

  // 계산 겹: 위쪽 묶음이 도착하면 늘어나기 직전 높이 값을 저장해 두고, 늘어난 뒤의 높이 값과의
  // 차(=위에 추가된 높이)를 scrollTop 에 그대로 더한다 — 앵커 행이 한 픽셀도 안 밀린다.
  const loadOlder = useCallback(() => {
    const view = viewRef.current;
    const anchor = anchorRef.current;
    if (!view || !anchor || loadingRef.current || (batchesRef.current ?? 0) >= MAX_BATCHES) { return; }
    loadingRef.current = true;
    const before = view.scrollHeight;
    anchor.classList.add(styles["asp__anchor--loading"]);
    window.setTimeout(() => {
      setCount((prev) => prev + OLDER_BATCH);
      // DOM 갱신 뒤 높이 차를 계산해 보정한다
      window.requestAnimationFrame(() => {
        const added = view.scrollHeight - before;
        view.scrollTop += added;   // 위에 붙은 높이 값만큼 보정
        setCorrection("보정 " + added + "px");
        batchesRef.current = (batchesRef.current ?? 0) + 1;
        loadingRef.current = false;
        anchor.classList.remove(styles["asp__anchor--loading"]);
      });
    }, LOAD_DELAY_MS);
  }, []);

  const recompute = useCallback(() => {
    const view = viewRef.current;
    if (!view) { return; }
    if (view.scrollTop <= 4 && !loadingRef.current) { loadOlder(); }
  }, [loadOlder]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) { return; }
    view.scrollTop = view.scrollHeight;   // 최신 대화가 보이는 상태로 시작
    const onScroll = () => recompute();
    view.addEventListener("scroll", onScroll);
    const takeover = () => {
      rootRef.current?.classList.remove(styles["is-demo"]);
      if (autoplayRef.current !== null) { window.clearInterval(autoplayRef.current); }
    };
    view.addEventListener("wheel", takeover, { passive: true });
    view.addEventListener("touchstart", takeover, { passive: true });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      autoplayRef.current = window.setInterval(() => {
        const v = viewRef.current;
        if (!v) { return; }
        if ((batchesRef.current ?? 0) >= MAX_BATCHES && dirRef.current !== 0) {
          dirRef.current = 0;
          window.setTimeout(() => {
            setCount(30);
            batchesRef.current = 0;
            v.scrollTop = 0;
            dirRef.current = 1;
            setCorrection("보정 0px");
          }, 700);
          return;
        }
        if (dirRef.current === 0 || loadingRef.current) { return; }
        v.scrollTop = Math.max(v.scrollTop - 5, 0);   // 위로 올려 과거 묶음 유발
        recompute();
      }, 60);
    }
    return () => {
      view.removeEventListener("scroll", onScroll);
      view.removeEventListener("wheel", takeover);
      view.removeEventListener("touchstart", takeover);
      if (autoplayRef.current !== null) { window.clearInterval(autoplayRef.current); }
    };
  }, [recompute]);

  const rowEls = [];
  const total = countRef.current ?? 30;
  for (let i = 30; i < total; i += 1) {
    rowEls.push(
      <li
        key={i}
        className={(i + 1) % 3 === 0 ? `${styles["asp__row"]} ${styles["asp__row--mine"]}` : styles["asp__row"]}
      >
        메시지 {String(i + 1).padStart(2, "0")}
      </li>
    );
  }

  return (
    <main className={styles.stage}>
      <div ref={rootRef} className={`${styles.asp} ${styles["is-demo"]}`} id="asp">
        <div className={styles["asp__head"]}>
          <span className={styles["asp__head-label"]}>위쪽 대화 불러오기</span>
          <span className={styles["asp__head-value"]}>{correction}</span>
        </div>
        <div ref={viewRef} className={styles["asp__view"]}>
          <ul className={styles["asp__track"]}>
            {rowEls}
            <li ref={anchorRef} className={styles["asp__anchor"]} aria-hidden="true" />
          </ul>
        </div>
      </div>
    </main>
  );
}
