import { useEffect, useRef } from "react";
import styles from "./PdfViewerSearchMatchHighlightJump.module.scss";

type KeyEvt = { key: string; preventDefault(): void };
type InputEvt = { target: { value: string } };

export default function PdfViewerSearchMatchHighlightJump() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current, input = inputRef.current, count = countRef.current;
    const doc = docRef.current, resultsBox = resultsRef.current;
    if (!root || !input || !count || !doc || !resultsBox) return;

    const LOOP_MS = 2000;
    const VOCAB = ["alpha", "beta", "gamma", "delta", "omega", "sigma", "kappa", "lambda", "theta", "zeta"];

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    function buildPages() {
      const rnd = seedRand(430031);
      const pages: string[][][] = [];
      for (let p = 0; p < 4; p += 1) {
        const lines: string[][] = [];
        for (let l = 0; l < 5; l += 1) {
          const words: string[] = [];
          for (let w = 0; w < 5; w += 1) words.push(VOCAB[Math.floor(rnd() * VOCAB.length)]);
          lines.push(words);
        }
        pages.push(lines);
      }
      pages[1][2][0] = "alpha";
      pages[3][1][2] = "alpha";
      pages[0][4][3] = "theta";
      pages[2][0][1] = "theta";
      return pages;
    }
    const pages = buildPages();

    pages.forEach((lines, pIdx) => {
      const page = document.createElement("div");
      page.className = styles.docPage;
      const title = document.createElement("div");
      title.className = styles.docTitle;
      title.style.width = (46 + (pIdx % 3) * 10) + "%";
      page.appendChild(title);
      lines.forEach((words) => {
        const lineEl = document.createElement("p");
        lineEl.className = styles.lineText;
        words.forEach((word, wi) => {
          const span = document.createElement("span");
          span.className = styles.w;
          span.textContent = word;
          lineEl.appendChild(span);
          if (wi < words.length - 1) lineEl.appendChild(document.createTextNode(" "));
        });
        page.appendChild(lineEl);
      });
      doc.appendChild(page);
    });
    const words = Array.prototype.slice.call(doc.querySelectorAll("." + styles.w)) as HTMLElement[];
    function pageOf(el: HTMLElement) {
      let node: HTMLElement | null = el;
      while (node && !node.classList.contains(styles.docPage)) node = node.parentElement;
      const all = Array.prototype.slice.call(doc!.children) as Element[];
      return all.indexOf(node as Element) + 1;
    }

    function find(q: string) {
      q = q.toLowerCase();
      if (!q) return [] as HTMLElement[];
      return words.filter((w) => w.textContent!.toLowerCase().indexOf(q) === 0);
    }

    let scrollAnim: { from: number; to: number; start: number; dur: number } | null = null;
    function startScroll(to: number, dur: number, nowMs: number) {
      scrollAnim = { from: doc!.scrollTop, to, start: nowMs, dur };
    }
    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

    let lastHit: HTMLElement | null = null;
    function jumpTo(el: HTMLElement, nowMs: number) {
      const target = Math.max(0, el.offsetTop - doc!.clientHeight * 0.35);
      startScroll(target, 460, nowMs);
      if (lastHit) lastHit.classList.remove(styles.hit);
      lastHit = el;
    }
    function ignite(el: HTMLElement) { el.classList.add(styles.hit); }
    function extinguish(el: HTMLElement) { el.classList.remove(styles.hit); }

    function renderList(matches: HTMLElement[]) {
      count!.textContent = matches.length + "개 일치";
      resultsBox!.innerHTML = "";
      matches.slice(0, 5).forEach((el) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = styles.result;
        b.textContent = "페이지 " + pageOf(el);
        b.addEventListener("click", () => { userActive = true; root!.classList.remove("is-demo"); jumpTo(el, lastTs || 0); ignite(el); });
        resultsBox!.appendChild(b);
      });
    }

    let userActive = false;
    function onInput(e: InputEvt) {
      userActive = true; root!.classList.remove("is-demo");
      const matches = find(e.target.value);
      renderList(matches);
    }
    function onKeydown(e: KeyEvt) {
      if (e.key === "Enter") {
        e.preventDefault();
        const matches = find(input!.value);
        if (matches.length) { userActive = true; root!.classList.remove("is-demo"); jumpTo(matches[0], lastTs || 0); ignite(matches[0]); }
      }
    }
    input.addEventListener("input", onInput as unknown as EventListener);
    input.addEventListener("keydown", onKeydown as unknown as EventListener);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { root.classList.remove("is-demo"); userActive = true; }

    const fired: Record<string, boolean> = {};
    let elapsedNow = 0;
    const SCHEDULE = [
      { t: 0, run: () => { input!.value = ""; renderList([]); startScroll(0, 260, elapsedNow); if (lastHit) { extinguish(lastHit); lastHit = null; } } },
      { t: 150, run: () => { input!.value = "al"; const m = find("al"); renderList(m); if (m[0]) jumpTo(m[0], elapsedNow); } },
      { t: 650, run: () => { if (lastHit) ignite(lastHit); } },
      { t: 980, run: () => { if (lastHit) extinguish(lastHit); } },
      { t: 1150, run: () => { input!.value = ""; renderList([]); } },
      { t: 1300, run: () => { input!.value = "th"; const m = find("th"); renderList(m); const pick = m[1] || m[0]; if (pick) jumpTo(pick, elapsedNow); } },
      { t: 1780, run: () => { if (lastHit) ignite(lastHit); } }
    ];

    let lastTs: number | null = null, elapsed = 0, raf = 0;
    function tick(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(ts - lastTs, 48);
      lastTs = ts;
      if (!userActive) {
        elapsed += dt;
        elapsedNow = elapsed;
        const loopIdx = Math.floor(elapsed / LOOP_MS);
        const phase = elapsed % LOOP_MS;
        SCHEDULE.forEach((a, i) => {
          const key = loopIdx + ":" + i;
          if (phase >= a.t && !fired[key]) { fired[key] = true; a.run(); }
        });
      }
      if (scrollAnim) {
        const p = Math.max(0, Math.min(1, (elapsedNow - scrollAnim.start) / scrollAnim.dur));
        doc!.scrollTop = scrollAnim.from + (scrollAnim.to - scrollAnim.from) * easeOutCubic(p);
        if (p >= 1) scrollAnim = null;
      }
      raf = requestAnimationFrame(tick);
    }
    renderList([]);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      input.removeEventListener("input", onInput as unknown as EventListener);
      input.removeEventListener("keydown", onKeydown as unknown as EventListener);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.pvs} is-demo`} ref={rootRef}>
        <div className={styles.bar}>
          <input className={styles.input} ref={inputRef} type="text" placeholder="검색" aria-label="문서 안 검색" autoComplete="off" />
          <span className={styles.count} ref={countRef}>0개 일치</span>
        </div>
        <div className={styles.body}>
          <div className={styles.doc} ref={docRef} />
          <div className={styles.results} ref={resultsRef} />
        </div>
      </div>
    </main>
  );
}
