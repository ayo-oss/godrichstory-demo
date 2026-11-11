import { useEffect, useRef } from "react";
import styles from "./DragPhysTrashShake.module.scss";

type Box<T> = { current: T };
type Pt = { x: number; y: number };

export default function DragPhysTrashShake() {
  const rootRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const trash = trashRef.current;
    const icon = iconRef.current;
    const caption = captionRef.current;
    if (!root || !trash || !icon || !caption) return;

    const TRASH_DWELL_SHAKE_MS = 700;
    const TRASH_SHAKE_MAX_PX = 5;
    const TRASH_DELETE_DWELL_MS = 550;
    const KEY_STEP_PX = 16;

    const pos: Pt = { x: 0, y: 0 };
    let basePos: Pt = { x: 0, y: 0 };
    let dragging = false;
    let grabbed = false;
    let dwellStart: number | null = null;
    let overTrash = false;
    let raf = 0;
    let deleted = false;

    function overlapsTrash() {
      const ir = icon!.getBoundingClientRect();
      const tr = trash!.getBoundingClientRect();
      const icx = ir.left + ir.width / 2, icy = ir.top + ir.height / 2;
      return icx > tr.left && icx < tr.right && icy > tr.top && icy < tr.bottom;
    }

    function applyIcon(shakeX: number, shakeY: number, scale: number) {
      icon!.style.transform =
        "translate(" + (pos.x + shakeX).toFixed(1) + "px," + (pos.y + shakeY).toFixed(1) + "px) scale(" + scale.toFixed(3) + ")";
    }

    function shakeTick(ts: number) {
      if (deleted) return;
      const isOver = overlapsTrash();
      if (isOver && !overTrash) { dwellStart = ts; }
      overTrash = isOver;
      trash!.classList.toggle(styles.isArmed, overTrash);
      let shakeX = 0, shakeY = 0;
      if (overTrash && dwellStart !== null) {
        const dwellMs = ts - dwellStart;
        const amp = Math.min(1, dwellMs / TRASH_DWELL_SHAKE_MS) * TRASH_SHAKE_MAX_PX;
        shakeX = Math.sin(ts / 40) * amp;
        shakeY = Math.cos(ts / 55) * amp * 0.6;
        if (dwellMs > TRASH_DELETE_DWELL_MS) {
          caption!.textContent = "지금 놓으면 삭제돼요";
          root!.classList.add(styles.isArmed);
        } else {
          caption!.textContent = "더 있으면 삭제 준비돼요";
          root!.classList.remove(styles.isArmed);
        }
      } else {
        caption!.textContent = dragging ? "휴지통 위로 옮겨보세요" : "휴지통 위에 오래 있으면 떨리다 사라져요";
        root!.classList.remove(styles.isArmed);
      }
      applyIcon(shakeX, shakeY, 1);
      if (dragging) raf = requestAnimationFrame(shakeTick);
    }

    function respawn() {
      deleted = false;
      pos.x = 0; pos.y = 0;
      icon!.style.opacity = "1";
      applyIcon(0, 0, 1);
      caption!.textContent = "휴지통 위에 오래 있으면 떨리다 사라져요";
    }

    function deleteIcon() {
      deleted = true;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      caption!.textContent = "삭제됐어요";
      if (reduce) {
        icon!.style.opacity = "0";
        let waitStart: number | null = null;
        function waitReduce(ts: number) {
          if (waitStart === null) waitStart = ts;
          if (ts - waitStart < 260) { requestAnimationFrame(waitReduce); } else { respawn(); }
        }
        requestAnimationFrame(waitReduce);
        return;
      }
      let start: number | null = null;
      function shrink(ts: number) {
        if (start === null) start = ts;
        const p = Math.min(1, (ts - start!) / 260);
        applyIcon(0, 0, 1 - p);
        icon!.style.opacity = String(1 - p);
        if (p < 1) { requestAnimationFrame(shrink); return; }
        let waitStart: number | null = null;
        function waitRespawn(ts2: number) {
          if (waitStart === null) waitStart = ts2;
          if (ts2 - waitStart < 260) { requestAnimationFrame(waitRespawn); } else { respawn(); }
        }
        requestAnimationFrame(waitRespawn);
      }
      requestAnimationFrame(shrink);
    }

    function beginDrag(clientX: number, clientY: number) {
      if (deleted) return;
      dragging = true;
      overTrash = false;
      dwellStart = null;
      basePos = { x: clientX - pos.x, y: clientY - pos.y };
      root!.classList.add(styles.isDragging);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(shakeTick);
    }

    function moveDrag(clientX: number, clientY: number) {
      pos.x = clientX - basePos.x;
      pos.y = clientY - basePos.y;
    }

    function endDrag() {
      dragging = false;
      root!.classList.remove(styles.isDragging);
      const isOver = overlapsTrash();
      const dwellMs = isOver && dwellStart !== null ? performance.now() - dwellStart : 0;
      if (isOver && dwellMs > TRASH_DELETE_DWELL_MS) {
        deleteIcon();
      } else {
        caption!.textContent = "휴지통 위에 오래 있으면 떨리다 사라져요";
        root!.classList.remove(styles.isArmed);
        trash!.classList.remove(styles.isArmed);
        applyIcon(0, 0, 1);
      }
    }

    function onPointerDown(e: PointerEvent) {
      root!.classList.remove("is-demo");
      icon!.setPointerCapture(e.pointerId);
      beginDrag(e.clientX, e.clientY);
      e.preventDefault();
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      moveDrag(e.clientX, e.clientY);
      e.preventDefault();
    }
    function onPointerUp(e: PointerEvent) {
      if (!dragging) return;
      endDrag();
      e.preventDefault();
    }
    icon.addEventListener("pointerdown", onPointerDown);
    icon.addEventListener("pointermove", onPointerMove);
    icon.addEventListener("pointerup", onPointerUp);

    function onKeyDown(e: KeyboardEvent) {
      root!.classList.remove("is-demo");
      if (deleted) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!grabbed) {
          grabbed = true;
          icon!.classList.add(styles.isGrabbed);
          const r = icon!.getBoundingClientRect();
          beginDrag(r.left + r.width / 2, r.top + r.height / 2);
          caption!.textContent = "잡았어요. 화살표로 휴지통 위로 옮기세요";
        } else {
          grabbed = false;
          icon!.classList.remove(styles.isGrabbed);
          dragging = false;
          endDrag();
        }
        return;
      }
      if (!grabbed) return;
      let dx = 0, dy = 0;
      if (e.key === "ArrowLeft") dx = -KEY_STEP_PX;
      else if (e.key === "ArrowRight") dx = KEY_STEP_PX;
      else if (e.key === "ArrowUp") dy = -KEY_STEP_PX;
      else if (e.key === "ArrowDown") dy = KEY_STEP_PX;
      else if (e.key === "Escape") {
        e.preventDefault();
        grabbed = false;
        icon!.classList.remove(styles.isGrabbed);
        dragging = false;
        root!.classList.remove(styles.isDragging, styles.isArmed);
        trash!.classList.remove(styles.isArmed);
        applyIcon(0, 0, 1);
        caption!.textContent = "휴지통 위에 오래 있으면 떨리다 사라져요";
        return;
      } else { return; }
      e.preventDefault();
      pos.x += dx; pos.y += dy;
    }
    icon.addEventListener("keydown", onKeyDown);

    applyIcon(0, 0, 1);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demoRaf = 0;
    if (reduce) {
      root.classList.remove("is-demo");
    } else {
      const iconRect0 = icon.getBoundingClientRect();
      const ox0 = iconRect0.left + iconRect0.width / 2;
      const oy0 = iconRect0.top + iconRect0.height / 2;
      const trashRect0 = trash.getBoundingClientRect();
      const tx0 = trashRect0.left + trashRect0.width / 2;
      const ty0 = trashRect0.top + trashRect0.height / 2;
      let demoStart: number | null = null;
      function demoTick(ts: number) {
        if (demoStart === null) demoStart = ts;
        const t = ts - demoStart;
        if (t < 200) {
          // 대기
        } else if (t < 700) {
          const p = (t - 200) / 500;
          const ease = 1 - Math.pow(1 - p, 2);
          const cx = ox0 + (tx0 - ox0) * ease;
          const cy = oy0 + (ty0 - oy0) * ease;
          if (t < 220) beginDrag(ox0, oy0);
          moveDrag(cx, cy);
        } else if (t < 1550) {
          moveDrag(tx0, ty0);
        } else if (t < 1600) {
          endDrag();
        } else {
          if (t > 2600) demoStart = ts - 60;
        }
        demoRaf = requestAnimationFrame(demoTick);
      }
      demoRaf = requestAnimationFrame(demoTick);
    }

    return () => {
      icon.removeEventListener("pointerdown", onPointerDown);
      icon.removeEventListener("pointermove", onPointerMove);
      icon.removeEventListener("pointerup", onPointerUp);
      icon.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(demoRaf);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.ts} is-demo`} ref={rootRef}>
        <div className={styles.trash} ref={trashRef} aria-hidden="true"></div>
        <button
          type="button"
          className={styles.icon}
          ref={iconRef}
          aria-label="휴지통 위에 놓으면 떨리다 사라지는 카드. Enter 로 잡고 화살표로 옮긴 뒤 Enter 로 놓아 삭제합니다"
        ></button>
        <p className={styles.caption} ref={captionRef}>휴지통 위에 오래 있으면 떨리다 사라져요</p>
      </div>
    </main>
  );
}
