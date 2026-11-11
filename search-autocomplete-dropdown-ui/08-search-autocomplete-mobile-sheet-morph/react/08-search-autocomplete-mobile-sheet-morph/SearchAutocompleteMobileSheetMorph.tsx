// SearchAutocompleteMobileSheetMorph — vanilla 판(run/335/demo/08-search-autocomplete-mobile-sheet-morph/index.html)
// 의 React 포트. matchMedia(340px) 로 좁은 화면을 감지해 같은 목록 DOM 을 인라인
// 드롭다운/바텀시트로 재배치한다(root 클래스 토글, 진짜 API). visualViewport 로
// 실측한 키보드 높이를 기본값으로 삼고, 그 위에 스크립트가 만든 0→1 목표값을
// lerp(관성 보간)로 뒤쫓게 해 "키보드가 밀어 올리는" 느낌을 재현한다 — 목록의
// max-height 를 --kb 변수로 calc() 에 물린다.
import { useEffect, useRef } from "react";
import styles from "./SearchAutocompleteMobileSheetMorph.module.scss";

export type SearchAutocompleteMobileSheetMorphProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "화면이 좁으면 matchMedia 가 같은 목록을 바텀시트로 다시 배치합니다";
const ARIA_LABEL = "과일 검색";
const LIST_LABEL = "제안 목록";

const WORDS = ["파인애플", "바나나", "자몽", "체리", "수박", "망고"];

export default function SearchAutocompleteMobileSheetMorph({
  duration = "300ms",
  easing = "ease-out",
  color = "#0a4fe8"
}: SearchAutocompleteMobileSheetMorphProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const sheet = sheetRef.current;
    const list = listRef.current;
    if (!root || !sheet || !list) return;

    list.innerHTML = WORDS.map((w) => '<li class="' + styles.item + '" role="option">' + w + "</li>").join("");

    const mq = window.matchMedia("(max-width: 340px)");
    function applyLayout(m: MediaQueryList | MediaQueryListEvent): void {
      root!.classList.toggle(styles.isSheet, m.matches);
    }
    applyLayout(mq);
    const mqAny = mq as MediaQueryList & { addListener?: (cb: (m: MediaQueryListEvent) => void) => void; removeListener?: (cb: (m: MediaQueryListEvent) => void) => void };
    if (mq.addEventListener) mq.addEventListener("change", applyLayout);
    else if (mqAny.addListener) mqAny.addListener(applyLayout);

    const vv = window.visualViewport;
    function realKbPx(): number {
      if (!vv) return 0;
      return Math.max(0, window.innerHeight - vv.height);
    }
    // 정적 캡처에서는 realKbPx() 가 대부분 0 이라 화면에 보이는 열림·닫힘은
    // 아래 목표값 lerp 가 만든다 — 실제 기기에서는 이 값이 목표값을 대신한다.
    let current = 0;
    let target = 0;
    let lastFlip = 0;
    let playing = true;
    let raf = 0;

    function tick(now: number): void {
      if (now - lastFlip > 900) {
        target = target === 0 ? 1 : 0;
        lastFlip = now;
      }
      current += (target - current) * 0.12;
      sheet!.style.setProperty("--kb", current.toFixed(4));
      if (playing) raf = requestAnimationFrame(tick);
    }

    function stop(): void {
      playing = false;
      sheet!.style.setProperty("--kb", "0");
    }
    root.addEventListener("pointerdown", stop);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      sheet.style.setProperty("--kb", String(realKbPx() > 0 ? 1 : 0.4));
    } else {
      raf = requestAnimationFrame((t) => {
        lastFlip = t;
        tick(t);
      });
    }

    return () => {
      playing = false;
      cancelAnimationFrame(raf);
      root.removeEventListener("pointerdown", stop);
      if (mq.removeEventListener) mq.removeEventListener("change", applyLayout);
      else if (mqAny.removeListener) mqAny.removeListener(applyLayout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ms} ref={rootRef}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.field}>
          <input
            className={styles.input}
            type="text"
            defaultValue="파인애플"
            readOnly
            aria-label={ARIA_LABEL}
            style={{ caretColor: color, transitionDuration: duration, transitionTimingFunction: easing }}
          />
        </div>
        <div className={styles.sheet} ref={sheetRef}>
          <span className={styles.handle} aria-hidden="true" />
          <ul className={styles.list} ref={listRef} role="listbox" aria-label={LIST_LABEL} />
        </div>
      </div>
    </main>
  );
}
