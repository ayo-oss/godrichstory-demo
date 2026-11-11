import { useEffect, useRef } from 'react';
import styles from './CaptionSlideUp.module.scss';

const IMAGE_MS = 550;
const CAPTION_GAP_MS = 120;
const CAPTION_MS = 420;
const HOLD_MS = 480;
const CLOSE_MS = 380;
const LOOP_MS = 2000;

// 문구.json 에서 en·ja 로 함께 옮겨지도록 문자열 리터럴로 둔다(html data-* 속성은 문구치환 대상 밖)
const captionByIdx = ['가을 산책길에서 담은 한 장', '도시의 야경', '바닷가에서 보낸 하루, 파도소리가 들리던 순간'];

export default function CaptionSlideUp() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene0 = sceneRef.current;
    if (!scene0) return undefined;
    const backdrop0 = scene0.querySelector<HTMLDivElement>('.' + styles.backdrop);
    const lightbox0 = scene0.querySelector<HTMLDivElement>('.' + styles.lightbox);
    const fullImg0 = scene0.querySelector<HTMLSpanElement>('.' + styles.fullImg);
    const caption0 = scene0.querySelector<HTMLParagraphElement>('.' + styles.caption);
    const closeBtn0 = scene0.querySelector<HTMLButtonElement>('.' + styles.closeBtn);
    const thumbs = Array.from(scene0.querySelectorAll<HTMLButtonElement>('.' + styles.thumb));
    if (!backdrop0 || !lightbox0 || !fullImg0 || !caption0 || !closeBtn0 || thumbs.length === 0) return undefined;
    const scene = scene0;
    const backdrop = backdrop0;
    const lightbox = lightbox0;
    const fullImg = fullImg0;
    const caption = caption0;
    const closeBtn = closeBtn0;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const imgClassByIdx = [styles['fullImg--a'], styles['fullImg--b'], styles['fullImg--c']];

    function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }
    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

    // reduce: 실사용 경로 적용 — 트윈 없이 최종 상태로 즉시 전환한다
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

    let open = false;
    let activeIdx = 1;
    let timers: number[] = [];

    function openFrom(idx: number) {
      if (open) return;
      open = true;
      caption.textContent = captionByIdx[idx];
      caption.style.transform = 'translateY(0px)';
      caption.style.opacity = '0';
      fullImg.className = styles.fullImg + ' ' + imgClassByIdx[idx];
      fullImg.style.transform = 'scale(.86)';
      fullImg.style.opacity = '0';
      lightbox.style.visibility = 'visible';
      lightbox.setAttribute('aria-hidden', 'false');
      backdrop.style.visibility = 'visible';

      animate(IMAGE_MS, (e) => {
        fullImg.style.transform = 'scale(' + (0.86 + 0.14 * e).toFixed(4) + ')';
        fullImg.style.opacity = e.toFixed(3);
        backdrop.style.opacity = (0.7 * e).toFixed(3);
      }, () => {
        // 캡션 자신의 실제 렌더 높이를 측정해 그 높이만큼 아래서 밀어 올린다 — 텍스트 길이마다 시작 위치가 다르다
        caption.style.visibility = 'hidden';
        caption.style.opacity = '1';
        const capH = caption.getBoundingClientRect().height;
        caption.style.transform = 'translateY(' + capH.toFixed(1) + 'px)';
        caption.style.visibility = 'visible';
        timers.push(window.setTimeout(() => {
          animate(CAPTION_MS, (e2) => {
            caption.style.transform = 'translateY(' + (capH * (1 - e2)).toFixed(1) + 'px)';
          }, () => {
            closeBtn.focus({ preventScroll: true });
          });
        }, CAPTION_GAP_MS));
      });
    }

    function closeLightbox() {
      if (!open) return;
      animate(CLOSE_MS, (e) => {
        fullImg.style.opacity = (1 - e).toFixed(3);
        caption.style.opacity = (1 - e).toFixed(3);
        backdrop.style.opacity = (0.7 * (1 - e)).toFixed(3);
      }, () => {
        lightbox.style.visibility = 'hidden';
        lightbox.setAttribute('aria-hidden', 'true');
        backdrop.style.visibility = 'hidden';
        open = false;
        thumbs[activeIdx].focus({ preventScroll: true });
      });
    }

    function human() {
      if (scene.classList.contains(styles['is-demo'])) {
        scene.classList.remove(styles['is-demo']);
        timers.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); });
        timers = [];
      }
    }

    const thumbHandlers = thumbs.map((_, i) => () => { human(); activeIdx = i; openFrom(i); });
    thumbs.forEach((t, i) => t.addEventListener('click', thumbHandlers[i]));

    function onCloseClick() { human(); closeLightbox(); }
    function onBackdropClick() { human(); closeLightbox(); }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) { human(); closeLightbox(); }
    }
    closeBtn.addEventListener('click', onCloseClick);
    backdrop.addEventListener('click', onBackdropClick);
    document.addEventListener('keydown', onKeydown);

    function cycle() {
      activeIdx = 2;
      openFrom(2);
      timers.push(window.setTimeout(closeLightbox, IMAGE_MS + CAPTION_GAP_MS + CAPTION_MS + HOLD_MS));
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
      <div className={styles.lightbox} role="dialog" aria-modal="true" aria-hidden="true" aria-label="사진과 설명 보기">
        <span className={styles.fullImg} />
        <p className={styles.caption} />
        <button className={styles.closeBtn} type="button">닫기</button>
      </div>
    </div>
  );
}
