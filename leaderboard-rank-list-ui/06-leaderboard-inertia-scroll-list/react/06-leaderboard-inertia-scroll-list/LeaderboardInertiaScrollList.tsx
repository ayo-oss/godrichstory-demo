import { useEffect, useRef } from "react";
import styles from "./LeaderboardInertiaScrollList.module.scss";

type Box<T> = { current: T };

const LEADERBOARD_SCROLL_FRICTION = 0.92;
const LEADERBOARD_SCROLL_MIN_VELOCITY = 0.04;
const LEADERBOARD_SCROLL_ROW_H = 40;
const LEADERBOARD_SCROLL_STEP_PX = 40;
const LEADERBOARD_SCROLL_AUTO_TICK_MS = 1500;

function seedRand(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

type PlayerRow = { name: string; score: number };

export default function LeaderboardInertiaScrollList() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const viewportRef = useRef(null) as unknown as Box<HTMLDivElement>;
  const trackRef = useRef(null) as unknown as Box<HTMLUListElement>;
  const srRef = useRef(null) as unknown as Box<HTMLParagraphElement>;

  useEffect(() => {
    const root = rootRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const sr = srRef.current;
    const rand = seedRand(418);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const players: PlayerRow[] = [
      { name: "CEDAR6", score: 988 }, { name: "IVORY3", score: 951 },
      { name: "PLUME9", score: 914 }, { name: "QUARTZ1", score: 877 },
      { name: "BRISK4", score: 840 }, { name: "MOSSY7", score: 803 },
      { name: "EMBER2", score: 766 }, { name: "SLATE8", score: 729 },
      { name: "GROVE5", score: 692 }, { name: "TIDE_0", score: 655 },
      { name: "FERN_9", score: 618 }, { name: "DUSK_3", score: 581 }
    ];

    const maxScroll = Math.max(0, players.length * LEADERBOARD_SCROLL_ROW_H - viewport.clientHeight);
    let offset = 0;
    let velocity = 0;
    let coasting = false;
    let dragging = false;
    let dragStartY = 0, dragStartOffset = 0, lastY = 0, lastT = 0;
    let raf: number | undefined;
    let timer: number | undefined;

    function human() {
      if (root.classList.contains("is-demo")) root.classList.remove("is-demo");
    }

    function clamp(v: number) {
      return Math.max(0, Math.min(maxScroll, v));
    }

    function render() {
      track.style.transform = "translateY(-" + offset.toFixed(1) + "px)";
    }

    function announceTop() {
      const idx = Math.round(offset / LEADERBOARD_SCROLL_ROW_H);
      const p = players[Math.max(0, Math.min(players.length - 1, idx))];
      sr.textContent = p.name + " 부터 보임";
    }

    function coastStep() {
      if (!coasting) return;
      offset += velocity;
      velocity *= LEADERBOARD_SCROLL_FRICTION;
      if (offset < 0) { offset = 0; velocity = 0; }
      if (offset > maxScroll) { offset = maxScroll; velocity = 0; }
      render();
      if (Math.abs(velocity) < LEADERBOARD_SCROLL_MIN_VELOCITY || offset === 0 || offset === maxScroll) {
        coasting = false;
        announceTop();
        return;
      }
      raf = requestAnimationFrame(coastStep);
    }

    function startCoast(v: number) {
      if (reduce) {
        offset = clamp(offset + v * 6);
        render();
        announceTop();
        return;
      }
      velocity = v;
      coasting = true;
      raf = requestAnimationFrame(coastStep);
    }

    function onPointerDown(e: PointerEvent) {
      human();
      dragging = true;
      coasting = false;
      dragStartY = e.clientY;
      dragStartOffset = offset;
      lastY = e.clientY;
      lastT = e.timeStamp;
      viewport.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const dy = dragStartY - e.clientY;
      offset = clamp(dragStartOffset + dy);
      const dt = Math.max(1, e.timeStamp - lastT);
      velocity = ((lastY - e.clientY) / dt) * 16;
      lastY = e.clientY;
      lastT = e.timeStamp;
      render();
    }

    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      startCoast(velocity);
    }

    function onWheel(e: WheelEvent) {
      human();
      e.preventDefault();
      offset = clamp(offset + e.deltaY * 0.5);
      render();
      announceTop();
    }

    function onKeydown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") { human(); e.preventDefault(); offset = clamp(offset + LEADERBOARD_SCROLL_STEP_PX); render(); announceTop(); }
      else if (e.key === "ArrowUp") { human(); e.preventDefault(); offset = clamp(offset - LEADERBOARD_SCROLL_STEP_PX); render(); announceTop(); }
      else if (e.key === "PageDown") { human(); e.preventDefault(); offset = clamp(offset + viewport.clientHeight); render(); announceTop(); }
      else if (e.key === "PageUp") { human(); e.preventDefault(); offset = clamp(offset - viewport.clientHeight); render(); announceTop(); }
    }

    players.forEach((p, i) => {
      const li = document.createElement("li");
      li.className = styles.lbi__row;
      li.setAttribute("role", "listitem");

      const rank = document.createElement("span");
      rank.className = styles.lbi__rank;
      rank.textContent = String(i + 1);
      const name = document.createElement("span");
      name.className = styles.lbi__name;
      name.textContent = p.name;
      const score = document.createElement("span");
      score.className = styles.lbi__score;
      score.textContent = String(p.score);

      li.appendChild(rank);
      li.appendChild(name);
      li.appendChild(score);
      track.appendChild(li);
    });

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("pointercancel", onPointerUp);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("keydown", onKeydown);

    render();

    if (!reduce) {
      const loop = () => {
        if (root.classList.contains("is-demo") && !dragging && !coasting) {
          const dir = rand() > 0.5 ? 1 : -1;
          const kick = (6 + rand() * 5) * dir;
          startCoast(kick);
        }
        timer = window.setTimeout(loop, LEADERBOARD_SCROLL_AUTO_TICK_MS);
      };
      timer = window.setTimeout(loop, LEADERBOARD_SCROLL_AUTO_TICK_MS);
    }

    return () => {
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("pointercancel", onPointerUp);
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("keydown", onKeydown);
      if (timer) window.clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.lbi + " is-demo"} ref={rootRef}>
        <div
          className={styles.lbi__viewport}
          ref={viewportRef}
          tabIndex={0}
          role="list"
          aria-label="랭킹 목록, 화살표 키로 스크롤"
        >
          <ul className={styles.lbi__track} ref={trackRef} />
        </div>
        <p className={styles.lbi__sr} ref={srRef} aria-live="polite" />
      </div>
    </main>
  );
}
