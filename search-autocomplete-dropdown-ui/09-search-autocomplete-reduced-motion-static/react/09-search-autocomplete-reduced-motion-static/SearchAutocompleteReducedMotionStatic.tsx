// SearchAutocompleteReducedMotionStatic — vanilla 판(run/335/demo/09-search-autocomplete-reduced-motion-static/index.html)
// 의 React 포트. 항목마다 등장 지연을 index * step 으로 계산해 순서대로 뜨는 스태거를
// 만들고, prefers-reduced-motion(matchMedia 실제 감지) 이거나 스위치가 켜지면 step 을
// 0 으로 눌러 같은 목록이 지연 없이 한 번에 뜬다 — 기능은 그대로, 모션만 사라진다.
import { useEffect, useRef } from "react";
import styles from "./SearchAutocompleteReducedMotionStatic.module.scss";

export type SearchAutocompleteReducedMotionStaticProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const ARIA_LABEL = "과일 검색";
const SWITCH_LABEL = "모션 줄이기";
const LIST_LABEL = "제안 목록";

const WORDS = ["복숭아", "딸기", "망고", "자몽", "체리"];
const STEP_MS = 50;

export default function SearchAutocompleteReducedMotionStatic({
  duration = "300ms",
  easing = "ease-out",
  color = "#5b8cf8"
}: SearchAutocompleteReducedMotionStaticProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const switchRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const input = inputRef.current;
    const list = listRef.current;
    const switchBtn = switchRef.current;
    if (!root || !input || !list || !switchBtn) return;

    const systemReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let reduced = systemReduced;

    function setSwitch(on: boolean): void {
      reduced = on;
      switchBtn!.setAttribute("aria-checked", on ? "true" : "false");
      root!.classList.toggle(styles.isReduced, on);
    }
    setSwitch(reduced);

    function close(): void {
      input!.setAttribute("aria-expanded", "false");
      list!.innerHTML = "";
    }

    function open(): void {
      const step = reduced ? 0 : STEP_MS;
      list!.innerHTML = WORDS.map(
        (w, i) => '<li class="' + styles.item + '" role="option" style="--delay:' + i * step + 'ms">' + w + "</li>"
      ).join("");
      input!.setAttribute("aria-expanded", "true");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          list!.classList.add(styles.isOpen);
        });
      });
    }

    function reopen(): void {
      list!.classList.remove(styles.isOpen);
      close();
      requestAnimationFrame(() => {
        open();
      });
    }

    open();
    list.classList.add(styles.isOpen);

    let playing = true;
    function stop(): void {
      playing = false;
    }
    function onSwitchClick(): void {
      stop();
      setSwitch(!reduced);
      reopen();
    }
    function onPointerDown(e: PointerEvent): void {
      const target = e.target as Node;
      if (target !== switchBtn && !switchBtn!.contains(target)) stop();
    }
    switchBtn.addEventListener("click", onSwitchClick);
    root.addEventListener("pointerdown", onPointerDown);

    let interval = 0;
    if (!systemReduced) {
      interval = window.setInterval(() => {
        if (!playing) return;
        setSwitch(!reduced);
        reopen();
      }, 500);
    }

    return () => {
      playing = false;
      window.clearInterval(interval);
      switchBtn.removeEventListener("click", onSwitchClick);
      root.removeEventListener("pointerdown", onPointerDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.rm} ref={rootRef}>
        <div className={styles.row}>
          <input
            className={styles.input}
            ref={inputRef}
            type="text"
            defaultValue="복숭아"
            readOnly
            aria-label={ARIA_LABEL}
            aria-expanded="false"
            role="combobox"
            aria-owns="rm09ListReact"
            aria-haspopup="listbox"
            style={{ caretColor: color, transitionDuration: duration, transitionTimingFunction: easing }}
          />
          <button className={styles.switch} ref={switchRef} type="button" role="switch" aria-checked="false" aria-label={SWITCH_LABEL}>
            <span className={styles.knob} />
          </button>
        </div>
        <ul className={styles.list} id="rm09ListReact" ref={listRef} role="listbox" aria-label={LIST_LABEL} />
      </div>
    </main>
  );
}
