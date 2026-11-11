import { useEffect, useRef } from 'react';
import styles from './CloseVelocityFling.module.scss';

const LIGHTBOX_FLING_VELOCITY_PX_MS = 0.5; // 놓는 순간 이 속도(px/ms) 를 넘으면 던진 것으로 본다
const DRAG_COMMIT_RATIO = 0.32; // 드래그 거리 / 무대 높이 가 이 비율을 넘어도 던진 것으로 본다
const SPRING_BACK_MS = 380;
const LOOP_MS = 2000;

export default function CloseVelocityFling() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene0 = sceneRef.current;
    if (!scene0) return undefined;
    const backdrop0 = scene0.querySelector<HTMLDivElement>('.' + styles.backdrop);
    const lightbox0 = scene0.querySelector<HTMLDivElement>('.' + styles.lightbox);
    const fullImg0 = scene0.querySelector<HTMLSpanElement>('.' + styles.fullImg);
    const dragNote0 = scene0.querySelector<HTMLParagraphElement>('.' + styles.dragNote);
    const closeBtn0 = scene0.querySelector<HTMLButtonElement>('.' + styles.closeBtn);
    const thumb0 = scene0.querySelector<HTMLButtonElement>('.' + styles.thumb);
    if (!backdrop0 || !lightbox0 || !fullImg0 || !dragNote0 || !closeBtn0 || !thumb0) return undefined;
    const scene = scene0;
    const backdrop = backdrop0;
    const lightbox = lightbox0;
    const fullImg = fullImg0;
    const dragNote = dragNote0;
    const closeBtn = closeBtn0;
    const thumb = thumb0;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let open = false;
    let dragging = false;
    let dragStartY = 0;
    let dragStartX = 0;
    let curY = 0;
    let curX = 0;
    let lastMoveY = 0;
    let lastMoveT = 0;
    let velocityY = 0;
    let timers: number[] = [];

    function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }
    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
    // 스프링 오버슛: 목표를 살짝 지나쳤다 되돌아온다
    function easeSpringBack(t: number) { const p = t - 1; return 1 + p * p * (2.7 * p + 1.7); }
    function stageH() { return scene.getBoundingClientRect().height; }

    function animate(duration: number, onFrame: (e: number) => void, onDone?: () => void, easeFn?: (t: number) => number) {
      const ease = easeFn || easeOutCubic;
      if (reduce) { onFrame(1); if (onDone) onDone(); return; }
      const start = performance.now();
      function frame(now: number) {
        const p = clamp((now - start) / duration, 0, 1);
        onFrame(ease(p));
        if (p < 1) requestAnimationFrame(frame);
        else if (onDone) onDone();
      }
      requestAnimationFrame(frame);
    }

    function setDrag(x: number, y: number, progress: number) {
      fullImg.style.transform = 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px) scale(' + (1 - progress * 0.22).toFixed(4) + ')';
      backdrop.style.opacity = (0.78 * (1 - progress)).toFixed(3);
      dragNote.style.opacity = (1 - progress * 2).toFixed(3);
    }

    function openFrom() {
      if (open) return;
      open = true;
      curX = 0; curY = 0;
      dragNote.style.opacity = '1';
      setDrag(0, 0, 0);
      lightbox.style.visibility = 'visible';
      lightbox.setAttribute('aria-hidden', 'false');
      backdrop.style.visibility = 'visible';
      animate(240, (e) => { backdrop.style.opacity = (e * 0.78).toFixed(3); }, () => {
        closeBtn.focus({ preventScroll: true });
      });
    }

    function closeLightbox() {
      if (!open) return;
      lightbox.style.visibility = 'hidden';
      lightbox.setAttribute('aria-hidden', 'true');
      backdrop.style.visibility = 'hidden';
      open = false;
      thumb.focus({ preventScroll: true });
    }

    // 던진 속도로 남은 거리를 마저 날아가게 한다 — 값이 클수록 짧고 빠르게 끝난다
    function flingClose(vy: number) {
      const h = stageH();
      const fromY = curY;
      const fromX = curX;
      const targetY = fromY + Math.sign(vy || 1) * (h * 1.4);
      const duration = clamp(220 / Math.max(Math.abs(vy), 0.35), 120, 320);
      animate(duration, (e) => {
        const y = fromY + (targetY - fromY) * e;
        const progress = clamp(Math.abs(y) / h, 0, 1);
        setDrag(fromX * (1 - e), y, progress);
      }, closeLightbox, (t) => t);
    }

    function springBack() {
      const fromX = curX;
      const fromY = curY;
      animate(SPRING_BACK_MS, (e) => {
        setDrag(fromX * (1 - e), fromY * (1 - e), 0);
      }, () => {
        curX = 0; curY = 0;
        closeBtn.focus({ preventScroll: true });
      }, easeSpringBack);
    }

    function human() {
      if (scene.classList.contains(styles['is-demo'])) {
        scene.classList.remove(styles['is-demo']);
        timers.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); });
        timers = [];
      }
    }

    function onThumbClick() { human(); openFrom(); }
    function onCloseClick() { human(); closeLightbox(); }
    function onBackdropClick() { human(); closeLightbox(); }
    function onKeydown(e: KeyboardEvent) {
      if (open && e.key === 'Escape') { human(); closeLightbox(); }
    }
    thumb.addEventListener('click', onThumbClick);
    closeBtn.addEventListener('click', onCloseClick);
    backdrop.addEventListener('click', onBackdropClick);
    document.addEventListener('keydown', onKeydown);

    function onPointerDown(e: PointerEvent) {
      human();
      dragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      lastMoveY = e.clientY;
      lastMoveT = performance.now();
      velocityY = 0;
      fullImg.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const now = performance.now();
      const dt = now - lastMoveT;
      if (dt > 0) velocityY = (e.clientY - lastMoveY) / dt;
      lastMoveY = e.clientY;
      lastMoveT = now;
      curX = e.clientX - dragStartX;
      curY = Math.max(0, e.clientY - dragStartY);
      const progress = clamp(curY / (stageH() * DRAG_COMMIT_RATIO), 0, 1);
      setDrag(curX, curY, progress);
    }
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      const h = stageH();
      const commit = curY > h * DRAG_COMMIT_RATIO || Math.abs(velocityY) > LIGHTBOX_FLING_VELOCITY_PX_MS;
      if (commit) flingClose(velocityY);
      else springBack();
    }
    fullImg.addEventListener('pointerdown', onPointerDown);
    fullImg.addEventListener('pointermove', onPointerMove);
    fullImg.addEventListener('pointerup', endDrag);
    fullImg.addEventListener('pointercancel', endDrag);

    function cycle() {
      openFrom();
      timers.push(window.setTimeout(() => {
        curX = 6; curY = 0;
        const h = stageH();
        const fromY = 0;
        animate(360, (e) => {
          curY = fromY + h * 0.62 * e;
          setDrag(curX * (1 - e * 0.4), curY, e * 0.7);
        }, () => {
          flingClose(LIGHTBOX_FLING_VELOCITY_PX_MS * 1.6);
        });
      }, 420));
    }

    if (!reduce) {
      cycle();
      timers.push(window.setInterval(() => {
        if (scene.classList.contains(styles['is-demo'])) cycle();
      }, LOOP_MS));
    }

    return () => {
      timers.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); });
      thumb.removeEventListener('click', onThumbClick);
      closeBtn.removeEventListener('click', onCloseClick);
      backdrop.removeEventListener('click', onBackdropClick);
      document.removeEventListener('keydown', onKeydown);
      fullImg.removeEventListener('pointerdown', onPointerDown);
      fullImg.removeEventListener('pointermove', onPointerMove);
      fullImg.removeEventListener('pointerup', endDrag);
      fullImg.removeEventListener('pointercancel', endDrag);
    };
  }, []);

  return (
    <div className={`${styles.scene} ${styles['is-demo']}`} ref={sceneRef}>
      <ul className={styles.grid}>
        <li><button className={styles.thumb} type="button" aria-haspopup="dialog"><span className={styles.thumbImg} /></button></li>
      </ul>
      <div className={styles.backdrop} />
      <div className={styles.lightbox} role="dialog" aria-modal="true" aria-hidden="true" aria-label="사진 던져서 닫기">
        <span className={styles.fullImg} />
        <p className={styles.dragNote}>아래로 끌어서 닫기</p>
        <button className={styles.closeBtn} type="button">닫기</button>
      </div>
    </div>
  );
}
