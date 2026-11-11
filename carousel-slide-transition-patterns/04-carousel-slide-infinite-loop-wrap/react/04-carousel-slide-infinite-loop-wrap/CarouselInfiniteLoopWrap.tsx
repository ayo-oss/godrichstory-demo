import { useEffect, useRef } from 'react';
import styles from './CarouselInfiniteLoopWrap.module.scss';

// 상수 — vanilla demo 04 (run/384/demo/04-carousel-slide-infinite-loop-wrap/index.html) 과 동일
const TOTAL = 5;
const CLONE_COUNT = 1;      // 앞뒤로 각 1장씩 이웃 카드를 복제해 둔다 — 경계에서도 다음 칸이 항상 보인다
const CARD_W = 200;
const GAP = 16;             // BD15: flex gap 대신 margin-right 로 간격을 준다(무한 루프 트랙 금지 규칙) — module.scss $sp-4 와 동일값
const STEP = CARD_W + GAP;
const TRANSITION_MS = 360;
const LABEL_PREFIX = '카드 ';
const LABEL_SEP = ' / ';
const COLOR_CLASSES = ['card--0', 'card--1', 'card--2', 'card--3', 'card--4'] as const;

export default function CarouselInfiniteLoopWrap() {
  const carouselRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return undefined;
    const viewport = carousel.querySelector<HTMLDivElement>('.' + styles.viewport);
    const track = carousel.querySelector<HTMLDivElement>('.' + styles.track);
    const readout = carousel.querySelector<HTMLDivElement>('.' + styles.readout);
    const prevBtn = carousel.querySelector<HTMLButtonElement>('.' + styles['navBtn--prev']);
    const nextBtn = carousel.querySelector<HTMLButtonElement>('.' + styles['navBtn--next']);
    if (!viewport || !track || !readout || !prevBtn || !nextBtn) return undefined;

    // 실제 카드 앞뒤에 이웃 카드를 복제해 그린다. realIndex = -1 은 마지막 카드의 복제, TOTAL 은 첫 카드의 복제.
    const sequence: number[] = [];
    for (let s = -CLONE_COUNT; s < TOTAL + CLONE_COUNT; s++) sequence.push(((s % TOTAL) + TOTAL) % TOTAL);

    track.innerHTML = '';
    sequence.forEach((realIdx) => {
      const el = document.createElement('div');
      el.className = styles.card + ' ' + styles[COLOR_CLASSES[realIdx]];
      const num = document.createElement('span');
      num.className = styles.num;
      num.textContent = String(realIdx + 1);
      el.appendChild(num);
      track.appendChild(el);
    });

    let pos = CLONE_COUNT;   // 트랙 안에서의 칸 위치(복제 포함) — CLONE_COUNT 가 실제 인덱스 0
    let dragging = false;
    let dragOriginPos = 0;
    let startX = 0;
    let demoTimers: number[] = [];

    function realIndex() {
      return ((pos - CLONE_COUNT) % TOTAL + TOTAL) % TOTAL;
    }
    function paint(withTransition: boolean) {
      track!.style.transition = withTransition ? 'transform ' + TRANSITION_MS + 'ms cubic-bezier(.22,.61,.36,1)' : 'none';
      track!.style.transform = 'translate3d(' + (-pos * STEP).toFixed(1) + 'px,0,0)';
      readout!.textContent = LABEL_PREFIX + (realIndex() + 1) + LABEL_SEP + TOTAL;
    }

    // 모듈로 감기 — 위치가 복제 구간(첫 칸 미만 또는 마지막 칸 초과)에 닿으면, 전환이 끝난 그 순간
    // transition 을 끄고 같은 그림의 실제 칸으로 pos 만 순간 이동시킨다(화면상 티가 나지 않는다).
    function wrapIfNeeded() {
      if (pos < CLONE_COUNT) {
        pos += TOTAL;
        paint(false);
        void track!.offsetWidth; // 강제 리플로우로 transition:none 을 확정시킨다
      } else if (pos >= CLONE_COUNT + TOTAL) {
        pos -= TOTAL;
        paint(false);
        void track!.offsetWidth;
      }
    }

    function onTransitionEnd() {
      wrapIfNeeded();
    }
    track.addEventListener('transitionend', onTransitionEnd);

    function human() {
      if (carousel!.classList.contains(styles['is-demo'])) {
        carousel!.classList.remove(styles['is-demo']);
        demoTimers.forEach((t) => window.clearTimeout(t));
        demoTimers = [];
      }
    }

    function go(dir: number) {
      pos += dir;
      paint(true);
    }
    function step(dir: number) {
      human();
      go(dir);
    }

    function onPointerDown(e: PointerEvent) {
      human();
      dragging = true;
      dragOriginPos = pos;
      startX = e.clientX;
      viewport!.setPointerCapture(e.pointerId);
      track!.classList.add(styles.isDragging);
      track!.style.transition = 'none';
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      pos = dragOriginPos - dx / STEP;
      track!.style.transform = 'translate3d(' + (-pos * STEP).toFixed(1) + 'px,0,0)';
    }
    function onPointerUp(e: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      track!.classList.remove(styles.isDragging);
      try { viewport!.releasePointerCapture(e.pointerId); } catch { /* 캡처가 이미 풀린 경우 */ }
      pos = Math.round(pos);
      paint(true);
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
    }
    function onPrev() { step(-1); }
    function onNext() { step(1); }

    viewport.addEventListener('pointerdown', onPointerDown);
    viewport.addEventListener('pointermove', onPointerMove);
    viewport.addEventListener('pointerup', onPointerUp);
    viewport.addEventListener('pointercancel', onPointerUp);
    viewport.addEventListener('keydown', onKeydown);
    prevBtn.addEventListener('click', onPrev);
    nextBtn.addEventListener('click', onNext);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // reduce: 실사용 경로 적용 — 드래그·키보드·버튼은 위 리스너가 그대로 모듈로 감기 계산을 돌린다.
    // 아래 demoCycle() 은 시연 게이트만이고 reduce 에서는 돌지 않는다.
    function demoCycle(i: number) {
      if (!carousel!.classList.contains(styles['is-demo'])) return;
      go(1);
      demoTimers.push(window.setTimeout(() => demoCycle(i + 1), TRANSITION_MS + 420));
    }

    paint(false);
    if (!reduce) demoCycle(0);

    return () => {
      track.removeEventListener('transitionend', onTransitionEnd);
      viewport.removeEventListener('pointerdown', onPointerDown);
      viewport.removeEventListener('pointermove', onPointerMove);
      viewport.removeEventListener('pointerup', onPointerUp);
      viewport.removeEventListener('pointercancel', onPointerUp);
      viewport.removeEventListener('keydown', onKeydown);
      prevBtn.removeEventListener('click', onPrev);
      nextBtn.removeEventListener('click', onNext);
      demoTimers.forEach((t) => window.clearTimeout(t));
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
          <div className={styles.track}></div>
        </div>
        <button type="button" className={styles.navBtn + ' ' + styles['navBtn--prev']} aria-label="이전 카드">
          <svg viewBox="0 0 256 256" width={18} height={18} aria-hidden="true"><g fill="currentColor"><path d="M112 56v144l-72-72Z" opacity=".2" /><path d="M216 120h-96V56a8 8 0 0 0-13.66-5.66l-72 72a8 8 0 0 0 0 11.32l72 72A8 8 0 0 0 120 200v-64h96a8 8 0 0 0 0-16m-112 60.69L51.31 128L104 75.31Z" /></g></svg>
        </button>
        <button type="button" className={styles.navBtn + ' ' + styles['navBtn--next']} aria-label="다음 카드">
          <svg viewBox="0 0 256 256" width={18} height={18} aria-hidden="true"><g fill="currentColor"><path d="m216 128l-72 72V56Z" opacity=".2" /><path d="m221.66 122.34l-72-72A8 8 0 0 0 136 56v64H40a8 8 0 0 0 0 16h96v64a8 8 0 0 0 13.66 5.66l72-72a8 8 0 0 0 0-11.32M152 180.69V75.31L204.69 128Z" /></g></svg>
        </button>
        <div className={styles.readout} aria-live="polite"></div>
      </section>
    </main>
  );
}
