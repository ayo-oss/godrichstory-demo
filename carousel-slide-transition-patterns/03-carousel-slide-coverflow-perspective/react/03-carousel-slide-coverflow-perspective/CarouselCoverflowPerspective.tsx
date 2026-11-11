import { useEffect, useRef } from 'react';
import styles from './CarouselCoverflowPerspective.module.scss';

// 상수 — vanilla demo 03 (run/384/demo/03-carousel-slide-coverflow-perspective/index.html) 과 동일
const TOTAL = 5;
const CARD_SPACING = 92;   // 드래그 1px 당 인덱스 변화 계산에 쓰는 카드 간격(px)
const ANGLE_STEP = 38;     // 중심에서 카드 1개 멀어질 때마다 더해지는 회전각(deg)
const MAX_ANGLE = 68;
const DEPTH_STEP = 90;     // 카드 1개 멀어질 때마다 밀어내는 translateZ(px)
const SCALE_STEP = 0.15;
const SCALE_FLOOR = 0.55;
const OPACITY_STEP = 0.24;
const OPACITY_FLOOR = 0.28;
const SNAP_EASE = 0.22;    // 릴리스 후 가장 가까운 정수 인덱스로 당기는 보간 비율(프레임당)
const SNAP_STOP = 0.004;
const DEMO_HOLD_MS = 520;
const LABEL_PREFIX = '카드 ';
const LABEL_SEP = ' / ';
const DEMO_SEQUENCE = [1, 2, 3, 4, 2, 0];

export default function CarouselCoverflowPerspective() {
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
    const cards = Array.prototype.slice.call(
      track.querySelectorAll<HTMLDivElement>('.' + styles.card)
    ) as HTMLDivElement[];

    let index = 0;   // 실수 인덱스 — 드래그 중에는 소수점 그대로 반영된다
    let dragging = false;
    let dragOriginIndex = 0;
    let startX = 0;
    let snapFrame = 0;
    let demoTimers: number[] = [];

    function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

    // 계산 겹 — 카드마다 중심(index)까지의 거리(소수 가능)를 회전각·깊이·크기·투명도로 매핑한다.
    function render() {
      for (let n = 0; n < cards.length; n++) {
        const dist = n - index;
        const absDist = Math.abs(dist);
        const angle = clamp(dist * ANGLE_STEP, -MAX_ANGLE, MAX_ANGLE);
        const z = -absDist * DEPTH_STEP;
        const scale = Math.max(SCALE_FLOOR, 1 - absDist * SCALE_STEP);
        const opacity = Math.max(OPACITY_FLOOR, 1 - absDist * OPACITY_STEP);
        const x = dist * 58;
        cards[n].style.transform = 'translateX(' + x.toFixed(1) + 'px) translateZ(' + z.toFixed(1) + 'px) rotateY(' + angle.toFixed(1) + 'deg) scale(' + scale.toFixed(3) + ')';
        cards[n].style.opacity = opacity.toFixed(2);
        cards[n].style.zIndex = String(100 - Math.round(absDist * 10));
      }
      const shown = clamp(Math.round(index), 0, TOTAL - 1);
      readout!.textContent = LABEL_PREFIX + (shown + 1) + LABEL_SEP + TOTAL;
    }

    function stopSnap() {
      if (snapFrame) { cancelAnimationFrame(snapFrame); snapFrame = 0; }
    }

    // 릴리스 후 가장 가까운 정수 인덱스로, 또는 지정한 목표 인덱스로 매 프레임 SNAP_EASE 비율만큼 당겨 붙인다.
    function animateIndexTo(targetIn: number) {
      const target = clamp(targetIn, 0, TOTAL - 1);
      function frame() {
        index += (target - index) * SNAP_EASE;
        render();
        if (Math.abs(target - index) > SNAP_STOP) {
          snapFrame = requestAnimationFrame(frame);
        } else {
          index = target;
          render();
          snapFrame = 0;
        }
      }
      snapFrame = requestAnimationFrame(frame);
    }

    function human() {
      if (carousel!.classList.contains(styles['is-demo'])) {
        carousel!.classList.remove(styles['is-demo']);
        demoTimers.forEach((t) => window.clearTimeout(t));
        demoTimers = [];
      }
    }

    function onPointerDown(e: PointerEvent) {
      human();
      stopSnap();
      dragging = true;
      dragOriginIndex = index;
      startX = e.clientX;
      viewport!.setPointerCapture(e.pointerId);
      track!.classList.add(styles.isDragging);
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      index = clamp(dragOriginIndex - dx / CARD_SPACING, 0, TOTAL - 1);
      render();
    }
    function onPointerUp(e: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      track!.classList.remove(styles.isDragging);
      try { viewport!.releasePointerCapture(e.pointerId); } catch { /* 캡처가 이미 풀린 경우 */ }
      animateIndexTo(Math.round(index));
    }
    function go(dir: number) {
      human();
      stopSnap();
      animateIndexTo(clamp(Math.round(index) + dir, 0, TOTAL - 1));
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { go(1); e.preventDefault(); }
    }
    function onPrev() { go(-1); }
    function onNext() { go(1); }

    viewport.addEventListener('pointerdown', onPointerDown);
    viewport.addEventListener('pointermove', onPointerMove);
    viewport.addEventListener('pointerup', onPointerUp);
    viewport.addEventListener('pointercancel', onPointerUp);
    viewport.addEventListener('keydown', onKeydown);
    prevBtn.addEventListener('click', onPrev);
    nextBtn.addEventListener('click', onNext);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // reduce: 실사용 경로 적용 — 드래그·키보드·버튼은 위 리스너가 그대로 거리 계산을 돌린다.
    // 아래 demoCycle() 은 시연 게이트만이고 reduce 에서는 돌지 않는다.
    function demoCycle(i: number) {
      if (!carousel!.classList.contains(styles['is-demo'])) return;
      animateIndexTo(DEMO_SEQUENCE[i % DEMO_SEQUENCE.length]);
      demoTimers.push(window.setTimeout(() => demoCycle(i + 1), DEMO_HOLD_MS));
    }

    render();
    if (!reduce) demoCycle(0);

    return () => {
      viewport.removeEventListener('pointerdown', onPointerDown);
      viewport.removeEventListener('pointermove', onPointerMove);
      viewport.removeEventListener('pointerup', onPointerUp);
      viewport.removeEventListener('pointercancel', onPointerUp);
      viewport.removeEventListener('keydown', onKeydown);
      prevBtn.removeEventListener('click', onPrev);
      nextBtn.removeEventListener('click', onNext);
      demoTimers.forEach((t) => window.clearTimeout(t));
      stopSnap();
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
          <div className={styles.track}>
            <div className={styles.card + ' ' + styles['card--0']} data-i={0}><span className={styles.num}>1</span></div>
            <div className={styles.card + ' ' + styles['card--1']} data-i={1}><span className={styles.num}>2</span></div>
            <div className={styles.card + ' ' + styles['card--2']} data-i={2}><span className={styles.num}>3</span></div>
            <div className={styles.card + ' ' + styles['card--3']} data-i={3}><span className={styles.num}>4</span></div>
            <div className={styles.card + ' ' + styles['card--4']} data-i={4}><span className={styles.num}>5</span></div>
          </div>
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
