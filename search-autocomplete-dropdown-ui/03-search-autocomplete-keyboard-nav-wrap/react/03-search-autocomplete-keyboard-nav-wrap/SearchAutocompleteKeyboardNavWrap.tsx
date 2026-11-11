// SearchAutocompleteKeyboardNavWrap — vanilla 판(run/335/demo/03-search-autocomplete-keyboard-nav-wrap/index.html)
// 의 React 포트. 활성 인덱스는 항상 (i + delta + 길이) % 길이 로 계산해 배열 양 끝에서
// 반대쪽으로 순환한다. aria-activedescendant 로 활성 항목을 알리고 scrollIntoView 의
// block:'nearest' 로 필요한 최소 거리만 스크롤한다.
import { useEffect, useRef } from "react";
import styles from "./SearchAutocompleteKeyboardNavWrap.module.scss";

export type SearchAutocompleteKeyboardNavWrapProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Box<T> = { current: T };

const HINT = "아래 · 위 화살표로 순환합니다";
const ARIA_LABEL = "과일 목록 탐색";
const ARIA_LIST_LABEL = "과일 목록";

const WORDS = ["바나나", "파파야", "아보카도", "파인애플", "자몽", "체리", "복숭아", "수박", "딸기", "망고"];
const STEP_MS = 230;

export default function SearchAutocompleteKeyboardNavWrap({
  duration = "220ms",
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#0a4fe8"
}: SearchAutocompleteKeyboardNavWrapProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const input = inputRef.current;
    const list = listRef.current;
    if (!input || !list) return;

    list.innerHTML = WORDS.map((w, i) => '<li class="' + styles.item + '" role="option" id="kb-opt-react-' + i + '">' + w + "</li>").join("");
    const items = list.querySelectorAll<HTMLElement>("." + styles.item);

    let activeIndex = 0;

    function updateActive(): void {
      items.forEach((el) => el.classList.remove(styles.isActive));
      const el = items[activeIndex];
      if (!el) return;
      el.classList.add(styles.isActive);
      input!.setAttribute("aria-activedescendant", el.id);
      el.scrollIntoView({ block: "nearest" });
    }

    function moveActive(delta: number): void {
      activeIndex = (activeIndex + delta + WORDS.length) % WORDS.length;
      updateActive();
    }
    updateActive();

    let playing = true;
    function stop(): void {
      playing = false;
    }
    function onKeydown(e: KeyboardEvent): void {
      stop();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveActive(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        moveActive(-1);
      }
    }
    input.addEventListener("keydown", onKeydown);
    input.addEventListener("pointerdown", stop);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!reduce) {
      let last = performance.now();
      const tick = (now: number): void => {
        if (playing) {
          if (now - last >= STEP_MS) {
            moveActive(1);
            last = now;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      input.removeEventListener("keydown", onKeydown);
      input.removeEventListener("pointerdown", stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.kb}>
        <p className={styles.hint}>
          <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M232 64v128a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8V64a8 8 0 0 1 8-8h192a8 8 0 0 1 8 8" opacity=".2" />
              <path d="M224 48H32a16 16 0 0 0-16 16v128a16 16 0 0 0 16 16h192a16 16 0 0 0 16-16V64a16 16 0 0 0-16-16m0 144H32V64h192zm-16-64a8 8 0 0 1-8 8H56a8 8 0 0 1 0-16h144a8 8 0 0 1 8 8m0-32a8 8 0 0 1-8 8H56a8 8 0 0 1 0-16h144a8 8 0 0 1 8 8M72 160a8 8 0 0 1-8 8h-8a8 8 0 0 1 0-16h8a8 8 0 0 1 8 8m96 0a8 8 0 0 1-8 8H96a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8m40 0a8 8 0 0 1-8 8h-8a8 8 0 0 1 0-16h8a8 8 0 0 1 8 8" />
            </g>
          </svg>
          {HINT}
        </p>
        <div className={styles.field}>
          <input
            className={styles.input}
            ref={inputRef}
            type="text"
            role="searchbox"
            aria-autocomplete="list"
            aria-controls="kbListReact"
            aria-label={ARIA_LABEL}
            aria-activedescendant="kb-opt-react-0"
            autoComplete="off"
            readOnly
            style={{ caretColor: color, transitionDuration: duration, transitionTimingFunction: easing }}
          />
        </div>
        <ul className={styles.list} id="kbListReact" ref={listRef} role="listbox" aria-label={ARIA_LIST_LABEL} />
      </div>
    </main>
  );
}
