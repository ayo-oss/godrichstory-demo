import { useEffect, useRef } from "react";
import styles from "./ScrollMomentumGravitySettleCard.module.scss";

export type ScrollMomentumGravitySettleCardProps = {
  color?: string;
};

export default function ScrollMomentumGravitySettleCard({
  color = "#f9a8d4",
}: ScrollMomentumGravitySettleCardProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const viewport = root.querySelector<HTMLDivElement>(`.${styles.viewport}`);
    const cards = Array.from(root.querySelectorAll<HTMLDivElement>(`.${styles.card}`));
    if (!viewport || cards.length === 0) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 계산 겹: 카드가 뷰포트에 들어오는 순간 위치 값(y)이 START_Y 에서 GRAVITY 가속으로 떨어지다
    // FLOOR_Y(0) 에 닿으면 속도 값에 RESTITUTION 을 곱한 만큼만 되튀어(반동), STOP_VEL 밑이면 멈춘다.
    const START_Y = -40;
    const FLOOR_Y = 0;
    const GRAVITY = 0.85;
    const RESTITUTION = 0.42;
    const STOP_VEL = 0.6;

    function dropTick(card: HTMLDivElement, y: number, vel: number) {
      vel += GRAVITY;
      y += vel;
      if (y >= FLOOR_Y) {
        y = FLOOR_Y;
        vel = -vel * RESTITUTION;
        if (Math.abs(vel) < STOP_VEL) {
          card.style.transform = "translateY(0px)";
          card.dataset.done = "1";
          return;
        }
      }
      card.style.transform = "translateY(" + y.toFixed(1) + "px)";
      requestAnimationFrame(() => dropTick(card, y, vel));
    }
    function settle(card: HTMLDivElement) {
      if (card.dataset.done) return;
      card.style.opacity = "1";
      if (reduce) { card.style.transform = "translateY(0px)"; card.dataset.done = "1"; return; }
      card.dataset.done = "1";
      dropTick(card, START_Y, 0);
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) settle(en.target as HTMLDivElement); });
    }, { root: viewport, threshold: 0.6 });
    cards.forEach((c) => io.observe(c));

    // 프로그램이 scrollTop 을 옮길 때도 네이티브 scroll 이벤트가 뜬다 — 자동 루프 중임을 이 플래그로
    // 표시해 "진짜 사용자 스크롤"과 구분한다.
    let autoScrolling = false;
    function onScroll() {
      if (autoScrolling) return;
      root!.classList.remove(styles.isDemo);
      stopAutoplay();
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      root!.classList.remove(styles.isDemo);
      stopAutoplay();
      viewport!.scrollTop += e.key === "ArrowDown" ? 40 : -40;
    }
    viewport.addEventListener("scroll", onScroll, { passive: true });
    viewport.addEventListener("keydown", onKeydown);

    let autoTimer: number | null = null;
    let raf2: number | null = null;
    function autoStep() {
      const max = viewport!.scrollHeight - viewport!.clientHeight;
      const next = viewport!.scrollTop + 1.6;
      autoScrolling = true;
      if (next >= max) {
        viewport!.scrollTop = max;
        raf2 = null;
        window.setTimeout(() => {
          if (root!.classList.contains(styles.isDemo)) {
            cards.forEach((c) => { delete c.dataset.done; c.style.transform = "translateY(" + START_Y + "px)"; c.style.opacity = "0"; });
            autoScrolling = true;
            viewport!.scrollTop = 0;
          }
        }, 500);
        return;
      }
      viewport!.scrollTop = next;
      raf2 = requestAnimationFrame(autoStep);
    }
    function stopAutoplay() {
      if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; }
      if (raf2 !== null) { cancelAnimationFrame(raf2); raf2 = null; }
    }
    if (!reduce) {
      autoTimer = window.setInterval(() => { if (raf2 === null) raf2 = requestAnimationFrame(autoStep); }, 1800);
      raf2 = requestAnimationFrame(autoStep);
    }

    return () => {
      io.disconnect();
      stopAutoplay();
      viewport.removeEventListener("scroll", onScroll);
      viewport.removeEventListener("keydown", onKeydown);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.isDemo}`}>
      <div className={styles.gsc}>
        <div
          className={styles.viewport}
          role="application"
          aria-label="낙하 정착 카드 목록"
          tabIndex={0}
        >
          <div className={styles.padTop} />
          <div className={styles.card}>카드 1</div>
          <div className={styles.spacer} />
          <div className={styles.card} style={{ background: color }}>카드 2</div>
          <div className={styles.spacer} />
          <div className={styles.card}>카드 3</div>
          <div className={styles.padBottom} />
        </div>
        <p className={styles.hint}>스크롤해 카드가 보이면 중력 값으로 떨어지다 바닥에서 튕기며 정착합니다</p>
      </div>
    </div>
  );
}
