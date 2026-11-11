import { useEffect, useRef } from "react";
import styles from "./LyricsSyncScroll.module.scss";

const LINE_COUNT = 10;
const LINE_NAMES = Array.from({ length: LINE_COUNT }, (_, i) => "Line " + (i < 9 ? "0" + (i + 1) : String(i + 1)));

export default function LyricsSyncScroll() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const playRef = useRef<HTMLButtonElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const lineRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    const playBtn = playRef.current;
    const viewport = viewportRef.current;
    const list = listRef.current;
    const lines = (lineRefs.current || []).filter((l): l is HTMLLIElement => !!l);
    if (!root || !playBtn || !viewport || !list || lines.length !== LINE_COUNT) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;

    const LINE_H = 22; // 한 줄의 세로 간격
    const VIEWPORT_H = 88;
    const PLAYBACK_LENGTH_S = 40; // 합성 타임라인 총 길이(초) — 실제 곡 길이가 아니라 시연용 값
    const SPEED = 8; // 시연 배속 — 실제 시간(Date)이 아니라 타임라인 값을 빨리 흘리는 시연 전용 배율
    const LINE_TIMES: number[] = [];
    for (let i = 0; i < LINE_COUNT; i++) LINE_TIMES.push(i * 4);
    viewport.style.height = VIEWPORT_H + "px";

    function human() { if (isDemo) { root!.classList.remove(styles["is-demo"]); isDemo = false; } }

    let playedMs = 0, playing = true;

    function activeIndexOf(progressS: number) {
      let idx = 0;
      for (let i = 0; i < LINE_TIMES.length; i++) { if (LINE_TIMES[i] <= progressS) idx = i; }
      return idx;
    }

    function seekToLine(i: number) {
      i = Math.max(0, Math.min(LINE_COUNT - 1, i));
      playedMs = (LINE_TIMES[i] / SPEED) * 1000;
    }

    let currentOffset: number | null = null;

    function render() {
      const progressS = ((playedMs / 1000) * SPEED) % PLAYBACK_LENGTH_S;
      const activeIndex = activeIndexOf(progressS);
      let target = activeIndex * LINE_H - (VIEWPORT_H / 2 - LINE_H / 2);
      const maxOffset = Math.max(0, LINE_COUNT * LINE_H - VIEWPORT_H);
      target = Math.max(0, Math.min(maxOffset, target));
      if (currentOffset == null) currentOffset = target;
      currentOffset += (target - currentOffset) * 0.22; // 타임라인이 옮겨간 자리로 관성 있게 다가간다
      list!.style.transform = "translateY(" + (-currentOffset).toFixed(2) + "px)";
      for (let i = 0; i < lines.length; i++) {
        const dist = Math.abs(i - activeIndex);
        const isActive = i === activeIndex;
        lines[i].classList.toggle(styles["is-active"], isActive);
        lines[i].setAttribute("aria-selected", String(isActive));
        lines[i].style.opacity = String(isActive ? 1 : Math.max(0.28, 1 - dist * 0.22));
        lines[i].style.transform = "scale(" + (isActive ? 1 : 0.94) + ")";
      }
    }

    function setPlaying(next: boolean) { playing = next; root!.classList.toggle(styles["is-playing"], next); }
    function onPlayClick() { human(); setPlaying(!playing); }
    function onPlayKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); human(); setPlaying(!playing); }
    }
    function onLineClick(i: number) { human(); seekToLine(i); render(); }
    function onViewportKeydown(e: KeyboardEvent) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); human();
        const progressS = ((playedMs / 1000) * SPEED) % PLAYBACK_LENGTH_S;
        const cur = activeIndexOf(progressS);
        seekToLine(cur + (e.key === "ArrowDown" ? 1 : -1));
        render();
      }
    }

    const lineClickHandlers = lines.map((_, i) => () => onLineClick(i));
    lines.forEach((li, i) => li.addEventListener("click", lineClickHandlers[i]));
    viewport.addEventListener("keydown", onViewportKeydown);

    let lastNow = 0;
    let raf = 0;
    function frame(now: number) {
      if (!lastNow) lastNow = now;
      const dt = now - lastNow;
      lastNow = now;
      const effPlaying = isDemo ? true : playing;
      if (effPlaying) playedMs += dt;
      render();
      raf = requestAnimationFrame(frame);
    }

    function onReduceClick() { human(); setPlaying(!playing); render(); }
    function onReduceKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); human(); setPlaying(!playing); render(); }
    }

    if (reduce) {
      root.classList.add(styles["is-still"]);
      render();
      playBtn.addEventListener("click", onReduceClick);
      playBtn.addEventListener("keydown", onReduceKeydown);
    } else {
      playBtn.addEventListener("click", onPlayClick);
      playBtn.addEventListener("keydown", onPlayKeydown);
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      lines.forEach((li, i) => li.removeEventListener("click", lineClickHandlers[i]));
      viewport.removeEventListener("keydown", onViewportKeydown);
      if (reduce) {
        playBtn.removeEventListener("click", onReduceClick);
        playBtn.removeEventListener("keydown", onReduceKeydown);
      } else {
        playBtn.removeEventListener("click", onPlayClick);
        playBtn.removeEventListener("keydown", onPlayKeydown);
      }
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.lyr + " " + styles["is-demo"] + " " + styles["is-playing"]} ref={rootRef}>
        <p className={styles.hint}><span>재생하면 타임라인 값이 흘러 그 줄을 찾아 화면 가운데로 하이라이트가 옮겨갑니다</span></p>
        <div className={styles.panel}>
          <button className={styles.play} ref={playRef} type="button" aria-label="재생">
            <svg className={`${styles.ico} ${styles.icoPlay}`} aria-hidden="true"><use href="#ico-play" /></svg>
            <svg className={`${styles.ico} ${styles.icoPause}`} aria-hidden="true"><use href="#ico-pause" /></svg>
          </button>
          <div className={styles.viewport} ref={viewportRef} tabIndex={0} role="listbox" aria-label="가사 줄, 화살표 키로 이동">
            <ul className={styles.list} ref={listRef}>
              {LINE_NAMES.map((name, i) => (
                <li
                  key={name}
                  className={styles.line}
                  ref={(el: HTMLLIElement | null) => { if (lineRefs.current) lineRefs.current[i] = el; }}
                  role="option"
                  data-i={i}
                  tabIndex={-1}
                >
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
