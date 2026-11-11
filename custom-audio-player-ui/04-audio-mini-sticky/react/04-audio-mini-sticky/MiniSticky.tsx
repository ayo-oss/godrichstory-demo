import { useEffect, useRef } from "react";
import styles from "./MiniSticky.module.scss";

export default function MiniSticky() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fullRef = useRef<HTMLDivElement | null>(null);
  const miniRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const scrollEl = scrollRef.current;
    const full = fullRef.current;
    const mini = miniRef.current;
    if (!root || !scrollEl || !full || !mini) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;

    const MORPH_RANGE_PX = 56; // 완전 전환까지 걸리는 스크롤 거리
    const SCROLL_STEP_PX = 48; // 방향키 한 번의 스크롤 단위
    let programmatic = false; // 시연 루프가 scrollTop 을 밀 때 뜨는 scroll 이벤트를 실사용 스크롤과 구분한다

    function human() { if (isDemo) { root!.classList.remove(styles["is-demo"]); isDemo = false; } }

    function recompute() {
      const threshold = full!.offsetHeight; // 실제 카드 높이를 기준으로 전환 시점을 계산한다
      const y = scrollEl!.scrollTop;
      const p = Math.min(1, Math.max(0, (y - threshold) / MORPH_RANGE_PX));
      mini!.style.opacity = String(p);
      mini!.style.transform = "translateY(" + (1 - p) * 16 + "px) scale(" + (0.94 + p * 0.06) + ")";
      mini!.style.pointerEvents = p > 0.5 ? "auto" : "none";
    }

    function onScroll() {
      if (programmatic) { programmatic = false; recompute(); return; }
      human(); recompute();
    }

    function onScrollKeydown(e: KeyboardEvent) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        human();
        scrollEl!.scrollTop += e.key === "ArrowDown" ? SCROLL_STEP_PX : -SCROLL_STEP_PX;
        recompute();
      }
    }

    function onMiniClick() {
      human();
      scrollEl!.scrollTop = 0;
      recompute();
    }

    let driveStart = 0;
    function triangle(frac: number) { return frac < 0.5 ? frac * 2 : 2 - frac * 2; }
    let rafDrive = 0;
    function driveTick(now: number) {
      if (!driveStart) driveStart = now;
      if (isDemo) {
        const DRIVE_PERIOD_MS = 2000; // 렌더 캐처 창(설정 초=2.0)과 같은 주기 — 시연 전용
        const frac = ((now - driveStart) % DRIVE_PERIOD_MS) / DRIVE_PERIOD_MS;
        const max = scrollEl!.scrollHeight - scrollEl!.clientHeight;
        programmatic = true;
        scrollEl!.scrollTop = triangle(frac) * max;
        recompute();
      }
      rafDrive = requestAnimationFrame(driveTick);
    }

    window.addEventListener("resize", recompute);

    if (reduce) {
      root.classList.add(styles["is-still"]);
      recompute();
      scrollEl.addEventListener("scroll", onScroll);
      scrollEl.addEventListener("keydown", onScrollKeydown);
      mini.addEventListener("click", onMiniClick);
    } else {
      scrollEl.addEventListener("scroll", onScroll);
      scrollEl.addEventListener("keydown", onScrollKeydown);
      mini.addEventListener("click", onMiniClick);
      recompute();
      rafDrive = requestAnimationFrame(driveTick);
    }

    return () => {
      window.removeEventListener("resize", recompute);
      cancelAnimationFrame(rafDrive);
      scrollEl.removeEventListener("scroll", onScroll);
      scrollEl.removeEventListener("keydown", onScrollKeydown);
      mini.removeEventListener("click", onMiniClick);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.mb + " " + styles["is-demo"]} ref={rootRef}>
        <p className={styles.hint}><span>아래로 스크롤하면 값이 계산되어 플레이어가 하단 미니 바로 접힙니다</span></p>
        <div className={styles.viewport}>
          <div className={styles.scroll} ref={scrollRef} tabIndex={0} role="group" aria-label="스크롤 데모 영역">
            <div className={styles.full} ref={fullRef}>
              <div className={styles.art} />
              <div className={styles.meta}>
                <div className={styles.title}>Untitled Session</div>
                <div className={styles.sub}>Track 01</div>
              </div>
            </div>
            <div className={styles.filler} aria-hidden="true">
              <div className={styles.line} />
              <div className={styles.line} />
              <div className={styles.line} />
              <div className={styles.line} />
              <div className={styles.line} />
              <div className={styles.line} />
            </div>
          </div>
          <button className={styles.mini} ref={miniRef} type="button" aria-label="전체 플레이어로 돌아가기">
            <div className={styles.miniArt} />
            <div className={styles.miniTitle}>Untitled Session</div>
            <svg className={styles.miniIco} aria-hidden="true"><use href="#ico-play" /></svg>
          </button>
        </div>
      </div>
    </main>
  );
}
