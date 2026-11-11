import { useEffect, useRef } from 'react';
import styles from './CarouselThumbnailSync.module.scss';

// 상수 — vanilla demo 06 (run/384/demo/06-carousel-slide-thumbnail-sync/index.html) 과 동일
const TOTAL = 5;
const THUMB_W = 46;
const THUMB_GAP = 10;
const THUMB_STEP = THUMB_W + THUMB_GAP;
const STRIP_W = 300;
const CENTER_EASE = 0.24;   // 매 프레임 목표 오프셋으로 당기는 비율 — scrollIntoView 가 아니라 직접 보간한다
const CENTER_STOP = 0.3;
const DEMO_HOLD_MS = 420;
const LABEL_PREFIX = '카드 ';
const LABEL_SEP = ' / ';
const COLOR_CLASSES = ['card--0', 'card--1', 'card--2', 'card--3', 'card--4'] as const;
const DEMO_SEQUENCE = [2, 4, 1, 3, 0];

export default function CarouselThumbnailSync() {
  const carouselRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return undefined;
    const viewport = carousel.querySelector<HTMLDivElement>('.' + styles.viewport);
    const mainSlide = carousel.querySelector<HTMLDivElement>('.' + styles.mainSlide);
    const thumbTrack = carousel.querySelector<HTMLDivElement>('.' + styles.thumbTrack);
    const readout = carousel.querySelector<HTMLDivElement>('.' + styles.readout);
    const prevBtn = carousel.querySelector<HTMLButtonElement>('.' + styles['navBtn--prev']);
    const nextBtn = carousel.querySelector<HTMLButtonElement>('.' + styles['navBtn--next']);
    if (!viewport || !mainSlide || !thumbTrack || !readout || !prevBtn || !nextBtn) return undefined;

    const thumbs: HTMLButtonElement[] = [];
    const thumbClickHandlers: (() => void)[] = [];
    thumbTrack.innerHTML = '';
    for (let i = 0; i < TOTAL; i++) {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = styles.thumb + ' ' + styles[COLOR_CLASSES[i]];
      t.textContent = String(i + 1);
      t.setAttribute('aria-label', LABEL_PREFIX + (i + 1) + LABEL_SEP + TOTAL);
      const idx = i;
      const handler = () => { human(); goTo(idx); };
      thumbClickHandlers.push(handler);
      t.addEventListener('click', handler);
      thumbTrack.appendChild(t);
      thumbs.push(t);
    }

    let current = 0;
    let offset = 0;        // 썸네일 트랙의 현재 translateX(px)
    let targetOffset = 0;  // 방금 계산한 목표 translateX(px)
    let centerFrame = 0;
    let demoTimers: number[] = [];

    function paintMain() {
      mainSlide!.className = styles.mainSlide + ' ' + styles[COLOR_CLASSES[current]];
      mainSlide!.textContent = String(current + 1);
      readout!.textContent = LABEL_PREFIX + (current + 1) + LABEL_SEP + TOTAL;
      thumbs.forEach((el, n) => el.classList.toggle(styles.isActive, n === current));
    }

    // 계산 겹 — 활성 썸네일의 중심이 띠의 중심에 오도록 목표 오프셋을 산술로 구하고,
    // 트랙 폭 안으로 클램프한 뒤 매 프레임 보간(lerp)해 다가간다. 브라우저의 scrollIntoView 를 쓰지 않는다.
    function computeTargetOffset() {
      const thumbCenter = current * THUMB_STEP + THUMB_W / 2;
      const raw = STRIP_W / 2 - thumbCenter;
      const trackWidth = TOTAL * THUMB_STEP - THUMB_GAP;
      const minOffset = Math.min(0, STRIP_W - trackWidth);
      return Math.max(minOffset, Math.min(0, raw));
    }

    function stopCenter() {
      if (centerFrame) { cancelAnimationFrame(centerFrame); centerFrame = 0; }
    }
    function centerActiveThumb() {
      targetOffset = computeTargetOffset();
      stopCenter();
      function frame() {
        offset += (targetOffset - offset) * CENTER_EASE;
        thumbTrack!.style.transform = 'translate3d(' + offset.toFixed(1) + 'px,0,0)';
        if (Math.abs(targetOffset - offset) > CENTER_STOP) {
          centerFrame = requestAnimationFrame(frame);
        } else {
          offset = targetOffset;
          thumbTrack!.style.transform = 'translate3d(' + offset.toFixed(1) + 'px,0,0)';
          centerFrame = 0;
        }
      }
      centerFrame = requestAnimationFrame(frame);
    }

    function goTo(i: number) {
      current = ((i % TOTAL) + TOTAL) % TOTAL;
      paintMain();
      centerActiveThumb();
    }

    function human() {
      if (carousel!.classList.contains(styles['is-demo'])) {
        carousel!.classList.remove(styles['is-demo']);
        demoTimers.forEach((t) => window.clearTimeout(t));
        demoTimers = [];
      }
    }

    function onPrev() { human(); goTo(current - 1); }
    function onNext() { human(); goTo(current + 1); }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') { human(); goTo(current - 1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { human(); goTo(current + 1); e.preventDefault(); }
    }

    prevBtn.addEventListener('click', onPrev);
    nextBtn.addEventListener('click', onNext);
    viewport.addEventListener('keydown', onKeydown);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // reduce: 실사용 경로 적용 — 썸네일 클릭·버튼·키보드는 위 리스너가 그대로 중앙 정렬 계산을 돌린다.
    // 아래 demoCycle() 은 시연 게이트만이고 reduce 에서는 돌지 않는다.
    function demoCycle(i: number) {
      if (!carousel!.classList.contains(styles['is-demo'])) return;
      goTo(DEMO_SEQUENCE[i % DEMO_SEQUENCE.length]);
      demoTimers.push(window.setTimeout(() => demoCycle(i + 1), DEMO_HOLD_MS));
    }

    paintMain();
    offset = computeTargetOffset();
    targetOffset = offset;
    thumbTrack.style.transform = 'translate3d(' + offset.toFixed(1) + 'px,0,0)';
    if (!reduce) demoCycle(0);

    return () => {
      prevBtn.removeEventListener('click', onPrev);
      nextBtn.removeEventListener('click', onNext);
      viewport.removeEventListener('keydown', onKeydown);
      thumbs.forEach((t, i) => t.removeEventListener('click', thumbClickHandlers[i]));
      demoTimers.forEach((t) => window.clearTimeout(t));
      stopCenter();
    };
  }, []);

  return (
    <main className={styles.stage}>
      <section
        className={styles.carousel + ' ' + styles['is-demo']}
        ref={carouselRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="카드 캐러셀"
      >
        <div className={styles.viewport} tabIndex={0}>
          <div className={styles.mainSlide}></div>
        </div>
        <button type="button" className={styles.navBtn + ' ' + styles['navBtn--prev']} aria-label="이전 카드">
          <svg viewBox="0 0 256 256" width={18} height={18} aria-hidden="true"><g fill="currentColor"><path d="M112 56v144l-72-72Z" opacity=".2" /><path d="M216 120h-96V56a8 8 0 0 0-13.66-5.66l-72 72a8 8 0 0 0 0 11.32l72 72A8 8 0 0 0 120 200v-64h96a8 8 0 0 0 0-16m-112 60.69L51.31 128L104 75.31Z" /></g></svg>
        </button>
        <button type="button" className={styles.navBtn + ' ' + styles['navBtn--next']} aria-label="다음 카드">
          <svg viewBox="0 0 256 256" width={18} height={18} aria-hidden="true"><g fill="currentColor"><path d="m216 128l-72 72V56Z" opacity=".2" /><path d="m221.66 122.34l-72-72A8 8 0 0 0 136 56v64H40a8 8 0 0 0 0 16h96v64a8 8 0 0 0 13.66 5.66l72-72a8 8 0 0 0 0-11.32M152 180.69V75.31L204.69 128Z" /></g></svg>
        </button>
        <div className={styles.thumbStrip}>
          <div className={styles.thumbTrack}></div>
        </div>
        <div className={styles.readout} aria-live="polite"></div>
      </section>
    </main>
  );
}
