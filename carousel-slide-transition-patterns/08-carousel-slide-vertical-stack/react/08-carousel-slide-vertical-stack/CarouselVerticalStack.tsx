import { useEffect, useRef } from 'react';
import styles from './CarouselVerticalStack.module.scss';

// 상수 — vanilla demo 08 (run/384/demo/08-carousel-slide-vertical-stack/index.html) 과 동일
const TOTAL = 5;
const STACK_STEP_Y = 14;     // 깊이 1단마다 밀어내는 translateY(px)
const STACK_SCALE_STEP = 0.07;
const STACK_SCALE_FLOOR = 0.72;
const STACK_OPACITY_STEP = 0.2;
const STACK_OPACITY_FLOOR = 0.25;
const WHEEL_COOLDOWN_MS = 420;
const DEMO_HOLD_MS = 480;
const LABEL_PREFIX = '카드 ';
const LABEL_SEP = ' / ';

export default function CarouselVerticalStack() {
  const carouselRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return undefined;
    const viewport = carousel.querySelector<HTMLDivElement>('.' + styles.viewport);
    const stack = carousel.querySelector<HTMLDivElement>('.' + styles.stack);
    const readout = carousel.querySelector<HTMLDivElement>('.' + styles.readout);
    const prevBtn = carousel.querySelector<HTMLButtonElement>('.' + styles['navBtn--prev']);
    const nextBtn = carousel.querySelector<HTMLButtonElement>('.' + styles['navBtn--next']);
    if (!viewport || !stack || !readout || !prevBtn || !nextBtn) return undefined;
    const cards = Array.prototype.slice.call(
      stack.querySelectorAll<HTMLDivElement>('.' + styles.card)
    ) as HTMLDivElement[];

    // order[d] = 깊이 d(0=맨 앞) 에 있는 카드의 원래 인덱스
    let order = [0, 1, 2, 3, 4];
    let lastWheel = 0;
    let demoTimers: number[] = [];

    // 계산 겹 — 깊이 d 를 translateY·scale·opacity·z-index 로 매핑한다(선형이 아니라 바닥값으로 수렴).
    function render() {
      order.forEach((cardIdx, depth) => {
        const el = cards[cardIdx];
        const y = depth * STACK_STEP_Y;
        const scale = Math.max(STACK_SCALE_FLOOR, 1 - depth * STACK_SCALE_STEP);
        const opacity = Math.max(STACK_OPACITY_FLOOR, 1 - depth * STACK_OPACITY_STEP);
        el.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0) scale(' + scale.toFixed(3) + ')';
        el.style.opacity = opacity.toFixed(2);
        el.style.zIndex = String(TOTAL - depth);
      });
      readout!.textContent = LABEL_PREFIX + (order[0] + 1) + LABEL_SEP + TOTAL;
    }

    function rotate(dir: number) {
      if (dir > 0) order.push(order.shift()!);
      else order.unshift(order.pop()!);
      render();
    }

    function human() {
      if (carousel!.classList.contains(styles['is-demo'])) {
        carousel!.classList.remove(styles['is-demo']);
        demoTimers.forEach((t) => window.clearTimeout(t));
        demoTimers = [];
      }
    }

    function onCardClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const el = target.closest<HTMLDivElement>('.' + styles.card);
      if (!el || cards.indexOf(el) !== order[0]) return; // 맨 앞 카드를 눌렀을 때만 넘긴다
      human();
      rotate(1);
    }
    function onWheel(e: WheelEvent) {
      const now = performance.now();
      if (now - lastWheel < WHEEL_COOLDOWN_MS) { e.preventDefault(); return; }
      lastWheel = now;
      human();
      rotate(e.deltaY > 0 ? 1 : -1);
      e.preventDefault();
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { human(); rotate(1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { human(); rotate(-1); e.preventDefault(); }
    }
    function onPrev() { human(); rotate(-1); }
    function onNext() { human(); rotate(1); }

    stack.addEventListener('click', onCardClick);
    viewport.addEventListener('wheel', onWheel, { passive: false });
    viewport.addEventListener('keydown', onKeydown);
    prevBtn.addEventListener('click', onPrev);
    nextBtn.addEventListener('click', onNext);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // reduce: 실사용 경로 적용 — 카드 클릭·휠·키보드·버튼은 위 리스너가 그대로 깊이 계산을 돌린다.
    // 아래 demoCycle() 은 시연 게이트만이고 reduce 에서는 돌지 않는다.
    function demoCycle(i: number) {
      if (!carousel!.classList.contains(styles['is-demo'])) return;
      rotate(1);
      demoTimers.push(window.setTimeout(() => demoCycle(i + 1), DEMO_HOLD_MS));
    }

    render();
    if (!reduce) demoCycle(0);

    return () => {
      stack.removeEventListener('click', onCardClick);
      viewport.removeEventListener('wheel', onWheel);
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
          <div className={styles.stack}>
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
