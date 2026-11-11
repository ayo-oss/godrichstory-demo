// SearchAutocompleteDebounceShimmer — vanilla 판(run/335/demo/02-search-autocomplete-debounce-shimmer/index.html)
// 의 React 포트. 키 입력마다 타이머를 지운 뒤 새로 건다(디바운스). 대기 중엔 스켈레톤 행을
// 보이고, 타이머가 실제로 만료된 뒤에만 가짜 지연(FAKE_LATENCY_MS) 후 결과를 반영한다.
// 요청마다 번호를 매겨(pendingId) 응답이 도착했을 때 그 번호가 최신이 아니면 버린다.
import { useEffect, useRef } from "react";
import styles from "./SearchAutocompleteDebounceShimmer.module.scss";

export type SearchAutocompleteDebounceShimmerProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Box<T> = { current: T };

const HINT = "타이핑을 멈추면 300ms 뒤에 한 번만 찾습니다";
const ARIA_LABEL = "과일 검색";
const ARIA_LIST_LABEL = "후보 목록";
const EMPTY_TEXT = "일치하는 과일이 없습니다";

const WORDS = ["바나나", "파파야", "아보카도", "파인애플", "자몽", "체리", "복숭아", "수박"];
const DEBOUNCE_MS = 300;
const FAKE_LATENCY_MS = 220;
const SKELETON_ROWS = 4;
const KEY_INTERVAL_MS = 120;
const READ_HOLD_MS = 500;
const CLEAR_MS = 150;
const WORD_SEQUENCE = ["복숭아", "자몽"];

export default function SearchAutocompleteDebounceShimmer({
  duration = "300ms",
  easing = "ease-out",
  color = "#17141a"
}: SearchAutocompleteDebounceShimmerProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const rafRef = useRef(0) as Box<number>;

  useEffect(() => {
    const field = fieldRef.current;
    const input = inputRef.current;
    const list = listRef.current;
    if (!field || !input || !list) return;

    let pendingId = 0;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let results: string[] = [];

    function renderSkeleton(): void {
      const rows: string[] = [];
      for (let i = 0; i < SKELETON_ROWS; i++) {
        rows.push(
          '<li class="' + styles.item + " " + styles.itemSkel + '" aria-hidden="true"><span class="' + styles.bar + '"><span class="' + styles.sweep + '"></span></span></li>'
        );
      }
      list!.innerHTML = rows.join("");
      field!.setAttribute("aria-expanded", "true");
    }

    function renderResults(): void {
      if (!results.length) {
        list!.innerHTML = '<li class="' + styles.item + " " + styles.itemEmpty + '">' + EMPTY_TEXT + "</li>";
        field!.setAttribute("aria-expanded", "true");
        return;
      }
      list!.innerHTML = results.map((w) => '<li class="' + styles.item + '" role="option">' + w + "</li>").join("");
      field!.setAttribute("aria-expanded", "true");
    }

    function renderIdle(): void {
      list!.innerHTML = "";
      field!.setAttribute("aria-expanded", "false");
    }

    function onChange(value: string): void {
      if (debounceTimer) clearTimeout(debounceTimer);
      pendingId++;
      const myId = pendingId;
      if (!value) {
        renderIdle();
        return;
      }
      renderSkeleton();
      debounceTimer = setTimeout(() => {
        setTimeout(() => {
          if (myId !== pendingId) return;
          const q = value.toLowerCase();
          results = WORDS.filter((w) => w.toLowerCase().indexOf(q) !== -1);
          renderResults();
        }, FAKE_LATENCY_MS);
      }, DEBOUNCE_MS);
    }
    renderIdle();

    let playing = true;
    function stop(): void {
      playing = false;
    }
    function onUserInput(): void {
      stop();
      onChange(input!.value);
    }
    input.addEventListener("input", onUserInput);
    input.addEventListener("keydown", stop);
    input.addEventListener("pointerdown", stop);

    function typeWord(word: string, cb: () => void): void {
      let i = 0;
      const nextChar = (): void => {
        if (!playing) return;
        i++;
        input!.value = word.slice(0, i);
        onChange(input!.value);
        if (i < word.length) setTimeout(nextChar, KEY_INTERVAL_MS);
        else setTimeout(cb, READ_HOLD_MS);
      };
      nextChar();
    }

    function clearInput(cb: () => void): void {
      if (!playing) return;
      input!.value = "";
      onChange("");
      setTimeout(cb, CLEAR_MS);
    }

    function loopPlay(qi: number): void {
      if (!playing) return;
      const word = WORD_SEQUENCE[qi % WORD_SEQUENCE.length];
      typeWord(word, () => {
        clearInput(() => loopPlay(qi + 1));
      });
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      input.value = WORD_SEQUENCE[0];
      onChange(WORD_SEQUENCE[0]);
    } else {
      loopPlay(0);
      const sweep = (): void => {
        const bars = list!.querySelectorAll<HTMLElement>("." + styles.sweep);
        const t = (performance.now() % 900) / 900;
        const x = -120 + t * 240;
        bars.forEach((b) => {
          b.style.transform = "translateX(" + x + "%)";
        });
        rafRef.current = requestAnimationFrame(sweep);
      };
      rafRef.current = requestAnimationFrame(sweep);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (debounceTimer) clearTimeout(debounceTimer);
      input.removeEventListener("input", onUserInput);
      input.removeEventListener("keydown", stop);
      input.removeEventListener("pointerdown", stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.db}>
        <p className={styles.hint}>{HINT}</p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="combobox"
          aria-expanded="false"
          aria-owns="dbListReact"
          aria-haspopup="listbox"
        >
          <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M192 112a80 80 0 1 1-80-80a80 80 0 0 1 80 80" opacity=".2" />
              <path d="m229.66 218.34l-50.06-50.06a88.21 88.21 0 1 0-11.32 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72" />
            </g>
          </svg>
          <input
            className={styles.input}
            ref={inputRef}
            type="text"
            role="searchbox"
            aria-autocomplete="list"
            aria-controls="dbListReact"
            aria-label={ARIA_LABEL}
            autoComplete="off"
            style={{ caretColor: color, transitionDuration: duration, transitionTimingFunction: easing }}
          />
        </div>
        <ul className={styles.list} id="dbListReact" ref={listRef} role="listbox" aria-label={ARIA_LIST_LABEL} />
      </div>
    </main>
  );
}
