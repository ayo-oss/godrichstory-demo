import { useEffect, useRef } from 'react';
import styles from './SwipeNextPrev.module.scss';

const SWIPE_COMMIT_RATIO = 0.25; // 드래그 거리 / 뷰포트 폭 이 이 비율을 넘으면 커밋
const SWIPE_VELOCITY_PX_MS = 0.5; // 놓는 순간 속도(px/ms) 가 이 값을 넘어도 커밋
const SNAP_MS = 320;
const LOOP_MS = 2000;
const COUNT = 3;

export default function SwipeNextPrev() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene0 = sceneRef.current;
    if (!scene0) return undefined;
    const backdrop0 = scene0.querySelector<HTMLDivElement>('.' + styles.backdrop);
    const lightbox0 = scene0.querySelector<HTMLDivElement>('.' + styles.lightbox);
    const viewport0 = scene0.querySelector<HTMLDivElement>('.' + styles.viewport);
    const track0 = scene0.querySelector<HTMLDivElement>('.' + styles.track);
    const prevBtn0 = scene0.querySelector<HTMLButtonElement>('.' + styles['navBtn--prev']);
    const nextBtn0 = scene0.querySelector<HTMLButtonElement>('.' + styles['navBtn--next']);
    const counter0 = scene0.querySelector<HTMLParagraphElement>('.' + styles.counter);
    const closeBtn0 = scene0.querySelector<HTMLButtonElement>('.' + styles.closeBtn);
    const thumbs = Array.from(scene0.querySelectorAll<HTMLButtonElement>('.' + styles.thumb));
    if (!backdrop0 || !lightbox0 || !viewport0 || !track0 || !prevBtn0 || !nextBtn0 || !counter0 || !closeBtn0 || thumbs.length === 0) return undefined;
    const scene = scene0;
    const backdrop = backdrop0;
    const lightbox = lightbox0;
    const viewport = viewport0;
    const track = track0;
    const prevBtn = prevBtn0;
    const nextBtn = nextBtn0;
    const counter = counter0;
    const closeBtn = closeBtn0;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let idx = 0;
    let open = false;
    let dragging = false;
    let dragStartX = 0;
    let dragBaseX = 0;
    let lastMoveX = 0;
    let lastMoveT = 0;
    let velocity = 0;
    let timers: number[] = [];

    function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }
    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
    function viewportW() { return viewport.getBoundingClientRect().width; }

    function animate(duration: number, onFrame: (e: number) => void, onDone?: () => void) {
      if (reduce) { onFrame(1); if (onDone) onDone(); return; }
      const start = performance.now();
      function frame(now: number) {
        const p = clamp((now - start) / duration, 0, 1);
        onFrame(easeOutCubic(p));
        if (p < 1) requestAnimationFrame(frame);
        else if (onDone) onDone();
      }
      requestAnimationFrame(frame);
    }

    function setTrackX(px: number) { track.style.transform = 'translateX(' + px.toFixed(2) + 'px)'; }
    function baseXFor(i: number) { return -i * viewportW(); }

    function goTo(nextIdxRaw: number, onDone?: () => void) {
      const nextIdx = clamp(nextIdxRaw, 0, COUNT - 1);
      const fromX = baseXFor(idx);
      const toX = baseXFor(nextIdx);
      animate(SNAP_MS, (e) => {
        setTrackX(fromX + (toX - fromX) * e);
      }, () => {
        idx = nextIdx;
        counter.textContent = (idx + 1) + ' / ' + COUNT;
        if (onDone) onDone();
      });
    }

    function openFrom(startIdx: number) {
      if (open) return;
      open = true;
      idx = startIdx;
      setTrackX(baseXFor(idx));
      counter.textContent = (idx + 1) + ' / ' + COUNT;
      lightbox.style.visibility = 'visible';
      lightbox.setAttribute('aria-hidden', 'false');
      backdrop.style.visibility = 'visible';
      backdrop.style.opacity = '0';
      animate(260, (e) => { backdrop.style.opacity = (e * 0.78).toFixed(3); }, () => {
        closeBtn.focus({ preventScroll: true });
      });
    }

    function closeLightbox() {
      if (!open) return;
      animate(240, (e) => { backdrop.style.opacity = (0.78 * (1 - e)).toFixed(3); }, () => {
        lightbox.style.visibility = 'hidden';
        lightbox.setAttribute('aria-hidden', 'true');
        backdrop.style.visibility = 'hidden';
        open = false;
        thumbs[idx].focus({ preventScroll: true });
      });
    }

    function human() {
      if (scene.classList.contains(styles['is-demo'])) {
        scene.classList.remove(styles['is-demo']);
        timers.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); });
        timers = [];
      }
    }

    const thumbHandlers = thumbs.map((_, i) => () => { human(); openFrom(i); });
    thumbs.forEach((t, i) => t.addEventListener('click', thumbHandlers[i]));

    function onCloseClick() { human(); closeLightbox(); }
    function onBackdropClick() { human(); closeLightbox(); }
    function onPrevClick() { human(); goTo(idx - 1); }
    function onNextClick() { human(); goTo(idx + 1); }
    function onKeydown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') { human(); closeLightbox(); }
      else if (e.key === 'ArrowLeft') { human(); goTo(idx - 1); }
      else if (e.key === 'ArrowRight') { human(); goTo(idx + 1); }
    }
    closeBtn.addEventListener('click', onCloseClick);
    backdrop.addEventListener('click', onBackdropClick);
    prevBtn.addEventListener('click', onPrevClick);
    nextBtn.addEventListener('click', onNextClick);
    document.addEventListener('keydown', onKeydown);

    function onPointerDown(e: PointerEvent) {
      human();
      dragging = true;
      dragStartX = e.clientX;
      dragBaseX = baseXFor(idx);
      lastMoveX = e.clientX;
      lastMoveT = performance.now();
      velocity = 0;
      viewport.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const now = performance.now();
      const dt = now - lastMoveT;
      if (dt > 0) velocity = (e.clientX - lastMoveX) / dt;
      lastMoveX = e.clientX;
      lastMoveT = now;
      setTrackX(dragBaseX + (e.clientX - dragStartX));
    }
    function endDrag(e: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      const deltaX = e.clientX - dragStartX;
      const w = viewportW();
      const commit = Math.abs(deltaX) > w * SWIPE_COMMIT_RATIO || Math.abs(velocity) > SWIPE_VELOCITY_PX_MS;
      if (commit) goTo(idx + (deltaX < 0 ? 1 : -1));
      else goTo(idx);
    }
    viewport.addEventListener('pointerdown', onPointerDown);
    viewport.addEventListener('pointermove', onPointerMove);
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    function cycle() {
      openFrom(0);
      timers.push(window.setTimeout(() => { goTo(1); }, 420));
      timers.push(window.setTimeout(() => { goTo(2); }, 1020));
      timers.push(window.setTimeout(closeLightbox, 1620));
    }

    if (!reduce) {
      cycle();
      timers.push(window.setInterval(() => {
        if (scene.classList.contains(styles['is-demo'])) cycle();
      }, LOOP_MS));
    }

    return () => {
      timers.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); });
      thumbs.forEach((t, i) => t.removeEventListener('click', thumbHandlers[i]));
      closeBtn.removeEventListener('click', onCloseClick);
      backdrop.removeEventListener('click', onBackdropClick);
      prevBtn.removeEventListener('click', onPrevClick);
      nextBtn.removeEventListener('click', onNextClick);
      document.removeEventListener('keydown', onKeydown);
      viewport.removeEventListener('pointerdown', onPointerDown);
      viewport.removeEventListener('pointermove', onPointerMove);
      viewport.removeEventListener('pointerup', endDrag);
      viewport.removeEventListener('pointercancel', endDrag);
    };
  }, []);

  return (
    <div className={`${styles.scene} ${styles['is-demo']}`} ref={sceneRef}>
      <ul className={styles.grid}>
        <li><button className={styles.thumb} type="button" aria-haspopup="dialog"><span className={`${styles.thumbImg} ${styles['thumbImg--a']}`} /></button></li>
        <li><button className={styles.thumb} type="button" aria-haspopup="dialog"><span className={`${styles.thumbImg} ${styles['thumbImg--b']}`} /></button></li>
        <li><button className={styles.thumb} type="button" aria-haspopup="dialog"><span className={`${styles.thumbImg} ${styles['thumbImg--c']}`} /></button></li>
      </ul>
      <div className={styles.backdrop} />
      <div className={styles.lightbox} role="dialog" aria-modal="true" aria-hidden="true" aria-label="사진 넘겨보기">
        <div className={styles.viewport}>
          <div className={styles.track}>
            <span className={`${styles.fullImg} ${styles['fullImg--a']}`} />
            <span className={`${styles.fullImg} ${styles['fullImg--b']}`} />
            <span className={`${styles.fullImg} ${styles['fullImg--c']}`} />
          </div>
        </div>
        <button className={`${styles.navBtn} ${styles['navBtn--prev']}`} type="button" aria-label="이전 사진">
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M160 48v160l-80-80Z" opacity=".2" />
              <path d="M163.06 40.61a8 8 0 0 0-8.72 1.73l-80 80a8 8 0 0 0 0 11.32l80 80A8 8 0 0 0 168 208V48a8 8 0 0 0-4.94-7.39M152 188.69L91.31 128L152 67.31Z" />
            </g>
          </svg>
        </button>
        <button className={`${styles.navBtn} ${styles['navBtn--next']}`} type="button" aria-label="다음 사진">
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="m176 128l-80 80V48Z" opacity=".2" />
              <path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z" />
            </g>
          </svg>
        </button>
        <p className={styles.counter} aria-live="polite">1 / 3</p>
        <button className={styles.closeBtn} type="button">닫기</button>
      </div>
    </div>
  );
}
