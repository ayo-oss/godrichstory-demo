import { useEffect, useRef } from 'react';
import styles from './KeyboardFocusTrapRing.module.scss';

const LIGHTBOX_FOCUS_RING_MS = 220; // 포커스 링이 다음 요소로 미끄러지는 시간
const STEP_HOLD_MS = 260;
const LOOP_MS = 2000;

type RingRect = { x: number; y: number; w: number; h: number };

export default function KeyboardFocusTrapRing() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene0 = sceneRef.current;
    if (!scene0) return undefined;
    const backdrop0 = scene0.querySelector<HTMLDivElement>('.' + styles.backdrop);
    const lightbox0 = scene0.querySelector<HTMLDivElement>('.' + styles.lightbox);
    const closeBtn0 = scene0.querySelector<HTMLButtonElement>('.' + styles.closeBtn);
    const prevBtn0 = scene0.querySelector<HTMLButtonElement>('.' + styles.prevBtn);
    const infoBtn0 = scene0.querySelector<HTMLButtonElement>('.' + styles.infoBtn);
    const nextBtn0 = scene0.querySelector<HTMLButtonElement>('.' + styles.nextBtn);
    const focusRing0 = scene0.querySelector<HTMLSpanElement>('.' + styles.focusRing);
    const thumb0 = scene0.querySelector<HTMLButtonElement>('.' + styles.thumb);
    if (!backdrop0 || !lightbox0 || !closeBtn0 || !prevBtn0 || !infoBtn0 || !nextBtn0 || !focusRing0 || !thumb0) return undefined;
    const scene = scene0;
    const backdrop = backdrop0;
    const lightbox = lightbox0;
    const closeBtn = closeBtn0;
    const prevBtn = prevBtn0;
    const infoBtn = infoBtn0;
    const nextBtn = nextBtn0;
    const focusRing = focusRing0;
    const thumb = thumb0;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 실제 tab 순서 — 이 배열이 곧 트랩의 앞뒤 경계다
    const order = [closeBtn, prevBtn, infoBtn, nextBtn];

    let open = false;
    let timers: number[] = [];
    let lastRingRect: RingRect | null = null;

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

    // FLIP: 링의 지금 실제 위치와 목표 요소의 실제 위치를 측정해 그 차만큼 되돌렸다가 0 으로 애니메이션한다
    function glideRingTo(el: HTMLElement) {
      const boxRect = lightbox.getBoundingClientRect();
      const toRect = el.getBoundingClientRect();
      const toX = toRect.left - boxRect.left;
      const toY = toRect.top - boxRect.top;
      const toW = toRect.width;
      const toH = toRect.height;
      const fromRect: RingRect = lastRingRect || { x: toX, y: toY, w: toW, h: toH };
      focusRing.style.width = toW + 'px';
      focusRing.style.height = toH + 'px';
      focusRing.style.transform = 'translate(' + toX + 'px,' + toY + 'px)';
      const dx = fromRect.x - toX;
      const dy = fromRect.y - toY;
      const sx = fromRect.w / toW;
      const sy = fromRect.h / toH;
      focusRing.style.opacity = '1';
      animate(LIGHTBOX_FOCUS_RING_MS, (e) => {
        const ix = dx * (1 - e);
        const iy = dy * (1 - e);
        const isx = sx + (1 - sx) * e;
        const isy = sy + (1 - sy) * e;
        focusRing.style.transform = 'translate(' + (toX + ix).toFixed(2) + 'px,' + (toY + iy).toFixed(2) + 'px) scale(' + isx.toFixed(4) + ',' + isy.toFixed(4) + ')';
      }, () => {
        lastRingRect = { x: toX, y: toY, w: toW, h: toH };
      });
    }

    const focusHandlers = order.map((el) => () => glideRingTo(el));
    order.forEach((el, i) => el.addEventListener('focus', focusHandlers[i]));

    function openFrom() {
      if (open) return;
      open = true;
      lastRingRect = null;
      focusRing.style.opacity = '0';
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
        focusRing.style.opacity = '0';
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

    // 진짜 포커스 트랩: 끝에서 Tab 하면 처음으로, 처음에서 Shift+Tab 하면 끝으로 감긴다
    function onLightboxKeydown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') { human(); closeLightbox(); return; }
      if (e.key !== 'Tab') return;
      const i = order.indexOf(document.activeElement as HTMLButtonElement);
      if (i === -1) return;
      if (e.shiftKey && i === 0) {
        e.preventDefault();
        human();
        order[order.length - 1].focus({ preventScroll: true });
      } else if (!e.shiftKey && i === order.length - 1) {
        e.preventDefault();
        human();
        order[0].focus({ preventScroll: true });
      }
    }
    lightbox.addEventListener('keydown', onLightboxKeydown);

    function cycle() {
      openFrom();
      let i = 0;
      function step() {
        if (i >= order.length) {
          // 끝에서 다시 처음으로 — 실제 트랩과 같은 감김을 시연
          order[0].focus({ preventScroll: true });
          timers.push(window.setTimeout(closeLightbox, STEP_HOLD_MS));
          return;
        }
        order[i].focus({ preventScroll: true });
        i += 1;
        timers.push(window.setTimeout(step, STEP_HOLD_MS));
      }
      timers.push(window.setTimeout(step, 260));
    }

    if (!reduce) {
      cycle();
      timers.push(window.setInterval(() => {
        if (scene.classList.contains(styles['is-demo'])) cycle();
      }, LOOP_MS));
    }

    return () => {
      timers.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); });
      order.forEach((el, i) => el.removeEventListener('focus', focusHandlers[i]));
      thumb.removeEventListener('click', onThumbClick);
      closeBtn.removeEventListener('click', onCloseClick);
      backdrop.removeEventListener('click', onBackdropClick);
      lightbox.removeEventListener('keydown', onLightboxKeydown);
    };
  }, []);

  return (
    <div className={`${styles.scene} ${styles['is-demo']}`} ref={sceneRef}>
      <ul className={styles.grid}>
        <li><button className={styles.thumb} type="button" aria-haspopup="dialog"><span className={styles.thumbImg} /></button></li>
      </ul>
      <div className={styles.backdrop} />
      <div className={styles.lightbox} role="dialog" aria-modal="true" aria-hidden="true" aria-label="키보드로만 움직이는 라이트박스">
        <span className={styles.fullImg} />
        <div className={styles.toolbar}>
          <button className={styles.prevBtn + ' ' + styles.ctrlBtn} type="button">이전</button>
          <button className={styles.infoBtn + ' ' + styles.ctrlBtn} type="button">정보</button>
          <button className={`${styles.nextBtn} ${styles.ctrlBtn} ${styles['ctrlBtn--primary']}`} type="button">다음</button>
        </div>
        <button className={styles.closeBtn} type="button">닫기</button>
        <span className={styles.focusRing} aria-hidden="true" />
      </div>
    </div>
  );
}
