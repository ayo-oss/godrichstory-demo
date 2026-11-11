import { useEffect, useRef } from "react";
import styles from "./TouchDragScrub.module.scss";

const STAR_PATH =
  "M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 19.771l-7.416 3.642 1.48-8.279-6.064-5.828 8.332-1.151z";

export default function TouchDragScrub() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const track = root.querySelector<HTMLDivElement>(`.${styles.track}`);
    const thumb = root.querySelector<HTMLElement>(`.${styles.thumb}`);
    const numEl = root.querySelector<HTMLElement>(`.${styles.num}`);
    if (!track || !thumb || !numEl) return;
    const clips = Array.prototype.slice.call(
      root.querySelectorAll(`.${styles.fillclip}`)
    ) as HTMLElement[];
    let pos = 0;
    let velocity = 0;
    let lastX = 0, lastT = 0;
    let dragging = false;
    let inertiaRaf: number | null = null;

    function width() { return track!.getBoundingClientRect().width; }

    function paintFromPos(p: number) {
      const w = width();
      const v = Math.max(0, Math.min(5, (p / w) * 5));
      clips.forEach((el, idx) => {
        const starVal = Math.max(0, Math.min(1, v - idx));
        el.style.width = (starVal * 100).toFixed(1) + "%";
      });
      numEl!.textContent = v.toFixed(1);
      thumb!.style.transform = "translateX(" + p.toFixed(1) + "px)";
    }

    function setPos(p: number) { pos = Math.max(0, Math.min(width(), p)); paintFromPos(pos); }

    function onDown(e: PointerEvent) {
      stopAutoplay();
      if (inertiaRaf !== null) { cancelAnimationFrame(inertiaRaf); inertiaRaf = null; }
      dragging = true;
      track!.setPointerCapture(e.pointerId);
      lastX = e.clientX; lastT = performance.now();
      const r = track!.getBoundingClientRect();
      setPos(e.clientX - r.left);
    }
    function onMove(e: PointerEvent) {
      if (!dragging) return;
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      velocity = (e.clientX - lastX) / dt;
      lastX = e.clientX; lastT = now;
      const r = track!.getBoundingClientRect();
      setPos(e.clientX - r.left);
    }
    // 계산 겹: 손을 뗀 시점의 속도(px/ms)를 그대로 이어받아 매 프레임 감쇠(마찰 0.945배)시키며
    // 위치를 계속 옮기는 관성 스크럽 — 손을 뗀 순간 값이 뚝 멈추지 않고 흐르다 멈춘다.
    function onUp() {
      if (!dragging) return;
      dragging = false;
      runInertia();
    }
    function runInertia() {
      velocity *= 0.945;
      setPos(pos + velocity * 16);
      if (Math.abs(velocity) > 0.015 && pos > 0 && pos < width()) {
        inertiaRaf = requestAnimationFrame(runInertia);
      } else {
        inertiaRaf = null;
      }
    }

    track.addEventListener("pointerdown", onDown);
    track.addEventListener("pointermove", onMove);
    track.addEventListener("pointerup", onUp);

    setPos(0);

    // 자동 루프: 드래그로 오른쪽까지 훑은 뒤 손을 뗀 상태를 흉내내 관성으로 더 흐르다 멈추는 것을
    // 반복한다 — 매 구간마다 방향을 바꿔 찔러 넣어(impulse) 감쇠 구간이 항상 겹쳐 흐르게 한다.
    let phase = 0;
    let autoTimer: number | null = null;
    function autoTick() {
      if (phase === 0) { setPos(width() * 0.08); velocity = 0.85; }
      else if (phase === 1) { velocity = 0.7; }
      else if (phase === 2) { velocity = -0.75; }
      else if (phase === 3) { velocity = -0.4; }
      runInertia();
      phase = (phase + 1) % 4;
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 460); autoTick(); }

    return () => {
      stopAutoplay();
      if (inertiaRaf !== null) cancelAnimationFrame(inertiaRaf);
      track.removeEventListener("pointerdown", onDown);
      track.removeEventListener("pointermove", onMove);
      track.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.sr}>
        <div className={styles.row}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={styles.star}>
              <svg className={styles.base} viewBox="0 0 24 24"><path d={STAR_PATH} /></svg>
              <span className={styles.fillclip}>
                <svg className={styles.fill} viewBox="0 0 24 24"><path d={STAR_PATH} /></svg>
              </span>
            </span>
          ))}
        </div>
        <div className={styles.track}><span className={styles.thumb} /></div>
        <div className={styles.readout}><b className={styles.num}>0.0</b> / 5</div>
      </div>
    </div>
  );
}
