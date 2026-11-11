import { useEffect, useRef } from 'react';
import styles from './ThumbnailMorphExpand.module.scss';

const LIGHTBOX_MORPH_SCALE_FROM = 0.3; // 썸네일 폭 = 장면 폭 × 이 비율 — 실제 레이아웃 크기로 FLIP 델타를 잰다
const OPEN_MS = 650;
const CLOSE_MS = 480;
const LOOP_MS = 2000;
const HOLD_OPEN_MS = 600;

export default function ThumbnailMorphExpand() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene0 = sceneRef.current;
    if (!scene0) return undefined;
    const backdrop0 = scene0.querySelector<HTMLDivElement>('.' + styles.backdrop);
    const lightbox0 = scene0.querySelector<HTMLDivElement>('.' + styles.lightbox);
    const fullImg0 = scene0.querySelector<HTMLSpanElement>('.' + styles.fullImg);
    const closeBtn0 = scene0.querySelector<HTMLButtonElement>('.' + styles.closeBtn);
    const thumbs = Array.from(scene0.querySelectorAll<HTMLButtonElement>('.' + styles.thumb));
    if (!backdrop0 || !lightbox0 || !fullImg0 || !closeBtn0 || thumbs.length === 0) return undefined;
    const scene = scene0;
    const backdrop = backdrop0;
    const lightbox = lightbox0;
    const fullImg = fullImg0;
    const closeBtn = closeBtn0;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const imgClassByIdx = [styles['thumbImg--a'], styles['thumbImg--b'], styles['thumbImg--c']];

    const sceneW = scene.getBoundingClientRect().width || 320;
    const thumbW = Math.round(sceneW * LIGHTBOX_MORPH_SCALE_FROM);
    thumbs.forEach((t) => {
      const img = t.querySelector<HTMLSpanElement>('.' + styles.thumbImg);
      if (!img) return;
      img.style.width = thumbW + 'px';
      img.style.height = Math.round(thumbW * 0.62) + 'px';
    });

    let open = false;
    let activeIdx = 1;
    let timers: number[] = [];

    function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }
    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

    // reduce: 실사용 경로 적용 — 트윈 없이 최종 상태로 즉시 전환한다(자동 루프는 아래에서 아예 안 돈다)
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

    function openFrom(idx: number) {
      if (open) return;
      open = true;
      const thumbImg = thumbs[idx].querySelector<HTMLSpanElement>('.' + styles.thumbImg);
      if (!thumbImg) return;
      const fromRect = thumbImg.getBoundingClientRect();
      fullImg.className = styles.fullImg + ' ' + imgClassByIdx[idx];
      lightbox.style.visibility = 'visible';
      lightbox.setAttribute('aria-hidden', 'false');
      backdrop.style.visibility = 'visible';
      const toRect = fullImg.getBoundingClientRect();
      const dx = (fromRect.left + fromRect.width / 2) - (toRect.left + toRect.width / 2);
      const dy = (fromRect.top + fromRect.height / 2) - (toRect.top + toRect.height / 2);
      const scaleFrom = fromRect.width / toRect.width;
      animate(OPEN_MS, (e) => {
        const s = scaleFrom + (1 - scaleFrom) * e;
        const tx = dx * (1 - e);
        const ty = dy * (1 - e);
        fullImg.style.transform = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) scale(' + s.toFixed(4) + ')';
        backdrop.style.opacity = (e * 0.72).toFixed(3);
      }, () => {
        closeBtn.focus({ preventScroll: true });
      });
    }

    function closeLightbox(idx: number) {
      if (!open) return;
      const thumbImg = thumbs[idx].querySelector<HTMLSpanElement>('.' + styles.thumbImg);
      if (!thumbImg) return;
      const fromRect = thumbImg.getBoundingClientRect();
      const toRect = fullImg.getBoundingClientRect();
      const dx = (fromRect.left + fromRect.width / 2) - (toRect.left + toRect.width / 2);
      const dy = (fromRect.top + fromRect.height / 2) - (toRect.top + toRect.height / 2);
      const scaleTo = fromRect.width / toRect.width;
      animate(CLOSE_MS, (e) => {
        const s = 1 + (scaleTo - 1) * e;
        const tx = dx * e;
        const ty = dy * e;
        fullImg.style.transform = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) scale(' + s.toFixed(4) + ')';
        backdrop.style.opacity = (0.72 * (1 - e)).toFixed(3);
      }, () => {
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

    const onThumbClick = (i: number) => () => { human(); activeIdx = i; openFrom(i); };
    const thumbHandlers = thumbs.map((_, i) => onThumbClick(i));
    thumbs.forEach((t, i) => t.addEventListener('click', thumbHandlers[i]));

    function onCloseClick() { human(); closeLightbox(activeIdx); }
    function onBackdropClick() { human(); closeLightbox(activeIdx); }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) { human(); closeLightbox(activeIdx); }
    }
    closeBtn.addEventListener('click', onCloseClick);
    backdrop.addEventListener('click', onBackdropClick);
    document.addEventListener('keydown', onKeydown);

    function cycle() {
      activeIdx = 1;
      openFrom(1);
      timers.push(window.setTimeout(() => { closeLightbox(1); }, OPEN_MS + HOLD_OPEN_MS));
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
      document.removeEventListener('keydown', onKeydown);
    };
  }, []);

  return (
    <div className={`${styles.scene} ${styles['is-demo']}`} ref={sceneRef}>
      <ul className={styles.grid}>
        <li><button className={styles.thumb} type="button" aria-haspopup="dialog"><span className={`${styles.thumbImg} ${styles['thumbImg--a']}`} /><span className={styles.thumbLabel}>사진 1</span></button></li>
        <li><button className={styles.thumb} type="button" aria-haspopup="dialog"><span className={`${styles.thumbImg} ${styles['thumbImg--b']}`} /><span className={styles.thumbLabel}>사진 2</span></button></li>
        <li><button className={styles.thumb} type="button" aria-haspopup="dialog"><span className={`${styles.thumbImg} ${styles['thumbImg--c']}`} /><span className={styles.thumbLabel}>사진 3</span></button></li>
      </ul>
      <div className={styles.backdrop} />
      <div className={styles.lightbox} role="dialog" aria-modal="true" aria-hidden="true" aria-label="사진 확대 보기">
        <span className={styles.fullImg} />
        <button className={styles.closeBtn} type="button">닫기</button>
      </div>
    </div>
  );
}
