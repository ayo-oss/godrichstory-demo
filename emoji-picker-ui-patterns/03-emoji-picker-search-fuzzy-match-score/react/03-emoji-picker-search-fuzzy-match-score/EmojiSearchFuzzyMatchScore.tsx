// EmojiSearchFuzzyMatchScore — vanilla 판(run/402/demo/03-.../index.html) 의 React 포트.
// score() 는 입력 글자를 이름 글자열 안에서 순서대로 찾아가며 연속·위치 가중치로 유사도 값을 매기고,
// rank() 는 그 값 내림차순으로 줄을 세운다. 목록은 React 가 다시 그리지 않고(liByName 로 노드를 재사용)
// FLIP 재배치 + 유사도 값을 그대로 막대 폭으로 바꾼 전환만 imperative 하게 준다 — vanilla 와 동일 동작.
import { useEffect, useRef, useState } from "react";
import styles from "./EmojiSearchFuzzyMatchScore.module.scss";

type Box<T> = { current: T };

const EMOJI_SEARCH_DEBOUNCE_MS = 200;

type Item = { ch: string; name: string };
const ITEMS: Item[] = [
  { ch: "\u{1F600}", name: "grinning face" }, { ch: "\u{1F602}", name: "joy tears" },
  { ch: "\u{1F525}", name: "fire flame" }, { ch: "\u{1F31F}", name: "glowing star" },
  { ch: "\u{1F389}", name: "party popper" }, { ch: "\u{1F9E0}", name: "brain idea" },
  { ch: "\u{1F680}", name: "rocket launch" }, { ch: "\u{1F338}", name: "cherry blossom" },
  { ch: "\u{1F4A7}", name: "water drop" }, { ch: "\u{1F308}", name: "rainbow arc" },
  { ch: "\u{1F52C}", name: "science lab" }, { ch: "\u{1F9ED}", name: "compass guide" },
];
const WORDS = ["fire", "roc", "star", "gui", ""];
const STEP = 260;

// 계산 겹: index.html score() 와 동일 — 입력 글자를 이름 글자열 안에서 순서대로 찾아가며
// 연속으로 이어질수록·앞쪽에서 맞을수록 유사도 값을 더 높게 쳐서 완전히 같지 않아도 값 순서로 줄을 세운다.
function score(query: string, name: string): number {
  if (!query) return 1;
  let qi = 0, s = 0, streak = 0;
  for (let ni = 0; ni < name.length && qi < query.length; ni++) {
    if (name[ni] === query[qi]) {
      streak++;
      s += 1 + streak * 2 + (ni === 0 ? 4 : 0);
      qi++;
    } else {
      streak = 0;
    }
  }
  if (qi < query.length) return 0;
  return s;
}

function rank(query: string): { it: Item; s: number }[] {
  const q = query.trim().toLowerCase();
  return ITEMS.map((it) => ({ it, s: score(q, it.name) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s);
}

export default function EmojiSearchFuzzyMatchScore() {
  const [isDemo, setIsDemo] = useState(true);

  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const synthRef = useRef(false) as unknown as Box<boolean>;
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const inputRef = useRef(null) as unknown as Box<HTMLInputElement>;
  const listRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const liveRef = useRef(null) as unknown as Box<HTMLParagraphElement>;
  const liByNameRef = useRef({} as { [k: string]: HTMLLIElement }) as unknown as Box<{ [k: string]: HTMLLIElement }>;
  const mountedRef = useRef(false) as unknown as Box<boolean>;
  const timerRef = useRef(0) as unknown as Box<number>;
  const loopTimerRef = useRef(0) as unknown as Box<number>;
  const wiRef = useRef(0) as unknown as Box<number>;
  const ciRef = useRef(0) as unknown as Box<number>;
  const phaseRef = useRef("type") as unknown as Box<string>;

  function human() {
    if (synthRef.current) return;
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function renderList(query: string) {
    const listEl = listRef.current;
    if (!listEl) return;
    const liByName = liByNameRef.current;
    const ranked = rank(query);
    const keep: { [k: string]: boolean } = {};
    const before: { [k: string]: DOMRect } = {};
    Array.prototype.forEach.call(listEl.children, (li: HTMLLIElement) => { before[li.dataset.name as string] = li.getBoundingClientRect(); });

    ranked.forEach((r) => {
      const it = r.it, pct = Math.min(100, Math.max(8, Math.round(r.s * 3)));
      keep[it.name] = true;
      let li = liByName[it.name];
      if (!li) {
        li = document.createElement("li");
        li.className = mountedRef.current ? styles.item + " " + styles.itemEnter : styles.item;
        li.dataset.name = it.name;
        li.setAttribute("role", "option"); li.setAttribute("aria-selected", "false");
        li.innerHTML = '<span class="' + styles.ch + '">' + it.ch + '</span><span class="' + styles.name + '">' + it.name +
          '</span><span class="' + styles.bar + '"><span class="' + styles.barFill + '"></span></span>';
        liByName[it.name] = li;
        listEl.appendChild(li);
        if (mountedRef.current) {
          requestAnimationFrame(() => {
            li!.classList.remove(styles.itemEnter);
            const fill = li!.querySelector("." + styles.barFill) as HTMLElement | null;
            if (fill) fill.style.width = pct + "%";
          });
        } else {
          const fill = li.querySelector("." + styles.barFill) as HTMLElement | null;
          if (fill) fill.style.width = pct + "%";
        }
      } else {
        li.classList.remove(styles.itemExit);
        listEl.appendChild(li);
        const fill = li.querySelector("." + styles.barFill) as HTMLElement | null;
        if (fill) fill.style.width = pct + "%";
      }
    });

    Object.keys(liByName).forEach((name) => {
      if (keep[name]) return;
      const li = liByName[name];
      li.classList.add(styles.itemExit);
      delete liByName[name];
      window.setTimeout(() => { if (li.parentNode) li.parentNode.removeChild(li); }, 220);
    });

    Array.prototype.forEach.call(listEl.children, (li: HTMLLIElement) => {
      if (li.classList.contains(styles.itemEnter) || li.classList.contains(styles.itemExit)) return;
      const b = before[li.dataset.name as string];
      if (!b) return;
      const a = li.getBoundingClientRect(), dy = b.top - a.top;
      if (Math.abs(dy) > 0.5) {
        li.style.transition = "none";
        li.style.transform = "translateY(" + dy + "px)";
        li.offsetHeight;
        li.style.transition = "";
        li.style.transform = "";
      }
    });
    if (liveRef.current) liveRef.current.textContent = ranked.length + "개 일치";
  }

  function onInput() {
    human();
    const q = inputRef.current ? inputRef.current.value : "";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => { renderList(q); }, reduce ? 0 : EMOJI_SEARCH_DEBOUNCE_MS);
  }

  useEffect(() => {
    renderList("");
    mountedRef.current = true;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function typeLoop() {
      if (!isDemoRef.current) return;
      const input = inputRef.current;
      if (!input) return;
      const word = WORDS[wiRef.current % WORDS.length];
      if (phaseRef.current === "type") {
        ciRef.current++;
        input.value = word.slice(0, ciRef.current);
        synthRef.current = true; input.dispatchEvent(new Event("input")); synthRef.current = false;
        if (ciRef.current >= word.length) { phaseRef.current = "erase"; loopTimerRef.current = window.setTimeout(typeLoop, STEP + 200); return; }
        loopTimerRef.current = window.setTimeout(typeLoop, STEP);
        return;
      }
      ciRef.current--;
      input.value = word.slice(0, Math.max(ciRef.current, 0));
      synthRef.current = true; input.dispatchEvent(new Event("input")); synthRef.current = false;
      if (ciRef.current <= 0) { phaseRef.current = "type"; wiRef.current++; loopTimerRef.current = window.setTimeout(typeLoop, STEP); return; }
      loopTimerRef.current = window.setTimeout(typeLoop, STEP);
    }
    if (!reduce) { loopTimerRef.current = window.setTimeout(typeLoop, 200); }
    else { isDemoRef.current = false; setIsDemo(false); }

    return () => { window.clearTimeout(timerRef.current); window.clearTimeout(loopTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.fz + " " + (isDemo ? styles.isDemo : "")} ref={rootRef}>
        <div className={styles.field}>
          <input className={styles.input} type="text" placeholder="이모지 이름 검색" aria-label="이모지 이름 검색"
                 autoComplete="off" ref={inputRef} onInput={onInput} />
        </div>
        <ul className={styles.list} role="listbox" aria-label="검색 결과" ref={listRef} />
        <p className={styles.sr} role="status" aria-live="polite" ref={liveRef} />
      </div>
    </main>
  );
}
