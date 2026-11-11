import { useEffect, useRef } from 'react';
import styles from './ThumbnailStripSync.module.scss';

const SYNC_MS = 320;
const HOLD_MS = 340;
const LOOP_MS = 2000;

export default function ThumbnailStripSync() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene0 = sceneRef.current;
    if (!scene0) return undefined;
    const backdrop0 = scene0.querySelector<HTMLDivElement>('.' + styles.backdrop);
    const lightbox0 = scene0.querySelector<HTMLDivElement>('.' + styles.lightbox);
    const fullImg0 = scene0.querySelector<HTMLSpanElement>('.' + styles.fullImg);
    const strip0 = scene0.querySelector<HTMLDivElement>('.' + styles.strip);
    const stripTrack0 = scene0.querySelector<HTMLDivElement>('.' + styles.stripTrack);
    const closeBtn0 = scene0.querySelector<HTMLButtonElement>('.' + styles.closeBtn);
    const thumb0 = scene0.querySelector<HTMLButtonElement>('.' + styles.thumb);
    const stripThumbs = Array.from(scene0.querySelectorAll<HTMLButtonElement>('.' + styles.stripThumb));
    if (!backdrop0 || !lightbox0 || !fullImg0 || !strip0 || !stripTrack0 || !closeBtn0 || !thumb0 || stripThumbs.length === 0) return undefined;
    const scene = scene0;
    const backdrop = backdrop0;
    const lightbox = lightbox0;
    const fullImg = fullImg0;
    const strip = strip0;
    const stripTrack = stripTrack0;
    const closeBtn = closeBtn0;
    const thumb = thumb0;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const imgClassByIdx = ['a', 'b', 'c', 'd', 'e'];
    const fullImgClassByIdx = [styles['fullImg--a'], styles['fullImg--b'], styles['fullImg--c'], styles['fullImg--d'], styles['fullImg--e']];
    const COUNT = stripThumbs.length;

    let open = false;
    let idx = 0;
    let currentX = 0;
    let timers: number[] = [];

    function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }
    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

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

    // 활성 썸네일을 줄 가운데로 오게 하는 이동량을 그때그때 실측한다 — index * 고정폭이 아니다.
    function centerOffsetFor(el: HTMLElement) {
      const thumbLeft = el.offsetLeft;
      const thumbW = el.offsetWidth;
      const stripW = strip.clientWidth;
      const trackW = stripTrack.scrollWidth;
      const target = stripW / 2 - thumbLeft - thumbW / 2;
      const minOffset = Math.min(0, stripW - trackW);
      return clamp(target, minOffset, 0);
    }

    function setStripX(px: number) { stripTrack.style.transform = 'translateX(' + px.toFixed(2) + 'px)'; }

    function goTo(nextIdxRaw: number, onDone?: () => void) {
      const nextIdx = clamp(nextIdxRaw, 0, COUNT - 1);
      idx = nextIdx;
      fullImg.className = styles.fullImg + ' ' + fullImgClassByIdx[idx];
      stripThumbs.forEach((t, i) => { t.classList.toggle(styles['is-active'], i === idx); });
      const target = centerOffsetFor(stripThumbs[idx]);
      const fromX = currentX;
      animate(SYNC_MS, (e) => {
        const x = fromX + (target - fromX) * e;
        setStripX(x);
      }, () => {
        currentX = target;
        if (onDone) onDone();
      });
    }

    function openFrom() {
      if (open) return;
      open = true;
      idx = 0;
      currentX = 0;
      setStripX(0);
      fullImg.className = styles.fullImg + ' ' + styles['fullImg--a'];
      stripThumbs.forEach((t, i) => { t.classList.toggle(styles['is-active'], i === 0); });
      lightbox.style.visibility = 'visible';
      lightbox.setAttribute('aria-hidden', 'false');
      backdrop.style.visibility = 'visible';
      animate(220, (e) => { backdrop.style.opacity = (e * 0.78).toFixed(3); }, () => {
        closeBtn.focus({ preventScroll: true });
      });
    }

    function closeLightbox() {
      if (!open) return;
      animate(200, (e) => { backdrop.style.opacity = (0.78 * (1 - e)).toFixed(3); }, () => {
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
        timers.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); });
        timers = [];
      }
    }

    function onThumbClick() { human(); openFrom(); }
    function onCloseClick() { human(); closeLightbox(); }
    function onBackdropClick() { human(); closeLightbox(); }
    thumb.addEventListener('click', onThumbClick);
    closeBtn.addEventListener('click', onCloseClick);
    backdrop.addEventListener('click', onBackdropClick);

    const stripHandlers = stripThumbs.map((_, i) => () => { human(); goTo(i); });
    stripThumbs.forEach((t, i) => t.addEventListener('click', stripHandlers[i]));

    function onKeydown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') { human(); closeLightbox(); }
      else if (e.key === 'ArrowRight') { human(); goTo(idx + 1); }
      else if (e.key === 'ArrowLeft') { human(); goTo(idx - 1); }
    }
    document.addEventListener('keydown', onKeydown);

    function cycle() {
      openFrom();
      timers.push(window.setTimeout(() => { goTo(2); }, 300));
      timers.push(window.setTimeout(() => { goTo(4); }, 300 + SYNC_MS + HOLD_MS));
      timers.push(window.setTimeout(closeLightbox, 300 + (SYNC_MS + HOLD_MS) * 2));
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
      stripThumbs.forEach((t, i) => t.removeEventListener('click', stripHandlers[i]));
      document.removeEventListener('keydown', onKeydown);
    };
  }, []);

  return (
    <div className={`${styles.scene} ${styles['is-demo']}`} ref={sceneRef}>
      <ul className={styles.grid}>
        <li><button className={styles.thumb} type="button" aria-haspopup="dialog"><span className={`${styles.thumbImg} ${styles['thumbImg--a']}`} /></button></li>
      </ul>
      <div className={styles.backdrop} />
      <div className={styles.lightbox} role="dialog" aria-modal="true" aria-hidden="true" aria-label="썸네일 줄과 함께 보기">
        <span className={styles.fullImg} />
        <div className={styles.strip}>
          <div className={styles.stripTrack}>
            <button className={styles.stripThumb} type="button" aria-label="1번째 사진"><span className={`${styles.thumbImg} ${styles['thumbImg--a']}`} /></button>
            <button className={styles.stripThumb} type="button" aria-label="2번째 사진"><span className={`${styles.thumbImg} ${styles['thumbImg--b']}`} /></button>
            <button className={styles.stripThumb} type="button" aria-label="3번째 사진"><span className={`${styles.thumbImg} ${styles['thumbImg--c']}`} /></button>
            <button className={styles.stripThumb} type="button" aria-label="4번째 사진"><span className={`${styles.thumbImg} ${styles['thumbImg--d']}`} /></button>
            <button className={styles.stripThumb} type="button" aria-label="5번째 사진"><span className={`${styles.thumbImg} ${styles['thumbImg--e']}`} /></button>
          </div>
        </div>
        <button className={styles.closeBtn} type="button">닫기</button>
      </div>
    </div>
  );
}
