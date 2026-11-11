import { useEffect, useRef } from 'react';
import styles from './ZoomPanDrag.module.scss';

const ZOOM_SCALE = 2.2;
const ZOOM_MS = 420;
const PAN_MS = 900;
const LOOP_MS = 2000;

export default function ZoomPanDrag() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene0 = sceneRef.current;
    if (!scene0) return undefined;
    const backdrop0 = scene0.querySelector<HTMLDivElement>('.' + styles.backdrop);
    const lightbox0 = scene0.querySelector<HTMLDivElement>('.' + styles.lightbox);
    const frame0 = scene0.querySelector<HTMLDivElement>('.' + styles.frame);
    const fullImg0 = scene0.querySelector<HTMLSpanElement>('.' + styles.fullImg);
    const zoomInBtn0 = scene0.querySelector<HTMLButtonElement>('.' + styles['zoomBtn--in']);
    const zoomOutBtn0 = scene0.querySelector<HTMLButtonElement>('.' + styles['zoomBtn--out']);
    const zoomNote0 = scene0.querySelector<HTMLParagraphElement>('.' + styles.zoomNote);
    const closeBtn0 = scene0.querySelector<HTMLButtonElement>('.' + styles.closeBtn);
    const thumb0 = scene0.querySelector<HTMLButtonElement>('.' + styles.thumb);
    if (!backdrop0 || !lightbox0 || !frame0 || !fullImg0 || !zoomInBtn0 || !zoomOutBtn0 || !zoomNote0 || !closeBtn0 || !thumb0) return undefined;
    const scene = scene0;
    const backdrop = backdrop0;
    const lightbox = lightbox0;
    const frame = frame0;
    const fullImg = fullImg0;
    const zoomInBtn = zoomInBtn0;
    const zoomOutBtn = zoomOutBtn0;
    const zoomNote = zoomNote0;
    const closeBtn = closeBtn0;
    const thumb = thumb0;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let open = false;
    let scale = 1;
    let offX = 0;
    let offY = 0;
    let dragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragBaseX = 0;
    let dragBaseY = 0;
    let panRafId: number | null = null;
    let timers: number[] = [];

    function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }
    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

    function animate(duration: number, onFrame: (e: number) => void, onDone?: () => void) {
      if (reduce) { onFrame(1); if (onDone) onDone(); return; }
      const start = performance.now();
      function frame2(now: number) {
        const p = clamp((now - start) / duration, 0, 1);
        onFrame(easeOutCubic(p));
        if (p < 1) requestAnimationFrame(frame2);
        else if (onDone) onDone();
      }
      requestAnimationFrame(frame2);
    }

    // 확대 배율만큼 남는 여백을 프레임 실측 크기로 매번 다시 계산한다 — 확대 정도가 바뀌면 이동 가능 범위도 바뀐다
    function panBounds(s: number) {
      const r = frame.getBoundingClientRect();
      return { x: (s - 1) * r.width / 2, y: (s - 1) * r.height / 2 };
    }

    function apply() {
      fullImg.style.transform = 'translate(' + offX.toFixed(2) + 'px,' + offY.toFixed(2) + 'px) scale(' + scale.toFixed(3) + ')';
      zoomNote.textContent = scale.toFixed(1) + '×';
    }

    function zoomTo(target: number, onDone?: () => void) {
      const fromScale = scale;
      const fromX = offX, fromY = offY;
      animate(ZOOM_MS, (e) => {
        scale = fromScale + (target - fromScale) * e;
        const b = panBounds(scale);
        offX = clamp(fromX * (1 - e), -b.x, b.x);
        offY = clamp(fromY * (1 - e), -b.y, b.y);
        apply();
      }, onDone);
    }

    function panLoop(durationMs: number, onDone?: () => void) {
      if (reduce) { if (onDone) onDone(); return; }
      const start = performance.now();
      function frame2(now: number) {
        const t = now - start;
        const b = panBounds(scale);
        offX = clamp(b.x * Math.sin(t / 300), -b.x, b.x);
        offY = clamp(b.y * 0.6 * Math.sin(t / 420 + 1), -b.y, b.y);
        apply();
        if (t < durationMs) panRafId = requestAnimationFrame(frame2);
        else if (onDone) onDone();
      }
      panRafId = requestAnimationFrame(frame2);
    }

    function openFrom() {
      if (open) return;
      open = true;
      scale = 1; offX = 0; offY = 0;
      apply();
      lightbox.style.visibility = 'visible';
      lightbox.setAttribute('aria-hidden', 'false');
      backdrop.style.visibility = 'visible';
      animate(240, (e) => { backdrop.style.opacity = (e * 0.78).toFixed(3); }, () => {
        zoomInBtn.focus({ preventScroll: true });
      });
    }

    function closeLightbox() {
      if (!open) return;
      if (panRafId) cancelAnimationFrame(panRafId);
      animate(220, (e) => { backdrop.style.opacity = (0.78 * (1 - e)).toFixed(3); }, () => {
        lightbox.style.visibility = 'hidden';
        lightbox.setAttribute('aria-hidden', 'true');
        backdrop.style.visibility = 'hidden';
        open = false;
        thumb.focus({ preventScroll: true });
      });
    }

    function human() {
      if (scene.classList.contains(styles['is-demo'])) {
        scene.classList.remove(styles['is-demo']);
        if (panRafId) cancelAnimationFrame(panRafId);
        timers.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); });
        timers = [];
      }
    }

    function onThumbClick() { human(); openFrom(); }
    function onCloseClick() { human(); closeLightbox(); }
    function onBackdropClick() { human(); closeLightbox(); }
    function onZoomInClick() { human(); zoomTo(ZOOM_SCALE); }
    function onZoomOutClick() { human(); zoomTo(1); }
    function onFrameDblClick() { human(); zoomTo(scale > 1.01 ? 1 : ZOOM_SCALE); }
    function onKeydown(e: KeyboardEvent) {
      if (open && e.key === 'Escape') { human(); closeLightbox(); }
    }
    thumb.addEventListener('click', onThumbClick);
    closeBtn.addEventListener('click', onCloseClick);
    backdrop.addEventListener('click', onBackdropClick);
    zoomInBtn.addEventListener('click', onZoomInClick);
    zoomOutBtn.addEventListener('click', onZoomOutClick);
    frame.addEventListener('dblclick', onFrameDblClick);
    document.addEventListener('keydown', onKeydown);

    function onPointerDown(e: PointerEvent) {
      if (scale <= 1.01) return;
      human();
      dragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragBaseX = offX;
      dragBaseY = offY;
      frame.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const b = panBounds(scale);
      offX = clamp(dragBaseX + (e.clientX - dragStartX), -b.x, b.x);
      offY = clamp(dragBaseY + (e.clientY - dragStartY), -b.y, b.y);
      apply();
    }
    function endDrag() { dragging = false; }
    frame.addEventListener('pointerdown', onPointerDown);
    frame.addEventListener('pointermove', onPointerMove);
    frame.addEventListener('pointerup', endDrag);
    frame.addEventListener('pointercancel', endDrag);

    function cycle() {
      openFrom();
      timers.push(window.setTimeout(() => {
        zoomTo(ZOOM_SCALE, () => {
          panLoop(PAN_MS, () => {
            zoomTo(1);
          });
        });
      }, 260));
      timers.push(window.setTimeout(closeLightbox, 1780));
    }

    if (!reduce) {
      cycle();
      timers.push(window.setInterval(() => {
        if (scene.classList.contains(styles['is-demo'])) cycle();
      }, LOOP_MS));
    }

    return () => {
      timers.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); });
      if (panRafId) cancelAnimationFrame(panRafId);
      thumb.removeEventListener('click', onThumbClick);
      closeBtn.removeEventListener('click', onCloseClick);
      backdrop.removeEventListener('click', onBackdropClick);
      zoomInBtn.removeEventListener('click', onZoomInClick);
      zoomOutBtn.removeEventListener('click', onZoomOutClick);
      frame.removeEventListener('dblclick', onFrameDblClick);
      document.removeEventListener('keydown', onKeydown);
      frame.removeEventListener('pointerdown', onPointerDown);
      frame.removeEventListener('pointermove', onPointerMove);
      frame.removeEventListener('pointerup', endDrag);
      frame.removeEventListener('pointercancel', endDrag);
    };
  }, []);

  return (
    <div className={`${styles.scene} ${styles['is-demo']}`} ref={sceneRef}>
      <ul className={styles.grid}>
        <li><button className={styles.thumb} type="button" aria-haspopup="dialog"><span className={styles.thumbImg} /></button></li>
      </ul>
      <div className={styles.backdrop} />
      <div className={styles.lightbox} role="dialog" aria-modal="true" aria-hidden="true" aria-label="사진 확대 이동">
        <div className={styles.frame}>
          <span className={styles.fullImg} />
        </div>
        <button className={`${styles.zoomBtn} ${styles['zoomBtn--in']}`} type="button" aria-label="확대">
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M192 112a80 80 0 1 1-80-80a80 80 0 0 1 80 80" opacity=".2" />
              <path d="m229.66 218.34l-50.06-50.06a88.21 88.21 0 1 0-11.32 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72m112 0a8 8 0 0 1-8 8h-24v24a8 8 0 0 1-16 0v-24H80a8 8 0 0 1 0-16h24V80a8 8 0 0 1 16 0v24h24a8 8 0 0 1 8 8" />
            </g>
          </svg>
        </button>
        <button className={`${styles.zoomBtn} ${styles['zoomBtn--out']}`} type="button" aria-label="축소">
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" aria-hidden="true">
            <g fill="currentColor">
              <path d="M192 112a80 80 0 1 1-80-80a80 80 0 0 1 80 80" opacity=".2" />
              <path d="m229.66 218.34l-50.06-50.06a88.21 88.21 0 1 0-11.32 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72m112 0a8 8 0 0 1-8 8H80a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8" />
            </g>
          </svg>
        </button>
        <p className={styles.zoomNote}>1.0×</p>
        <button className={styles.closeBtn} type="button">닫기</button>
      </div>
    </div>
  );
}
