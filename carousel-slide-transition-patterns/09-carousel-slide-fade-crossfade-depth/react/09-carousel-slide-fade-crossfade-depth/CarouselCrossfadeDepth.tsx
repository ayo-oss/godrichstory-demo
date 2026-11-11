import { useEffect, useRef } from 'react';
import styles from './CarouselCrossfadeDepth.module.scss';

// 상수 — vanilla demo 09 (run/384/demo/09-carousel-slide-fade-crossfade-depth/index.html) 과 동일
const TOTAL = 5;
const CROSSFADE_MS = 480;
const DEPTH_SCALE = 0.18; // 페이드 도중 줄었다 늘어나는 scale 폭
const DEPTH_PUSH = 70;    // 페이드 도중 밀려나는 translateZ(px) 깊이
const DEMO_HOLD_MS = 620;
const LABEL_PREFIX = '카드 ';
const LABEL_SEP = ' / ';
const GOTO_LABEL_PREFIX = '카드 ';
const GOTO_LABEL_SUFFIX = '로 이동';

// 이징 겹 — CSS 트랜지션이 아니라 매 프레임 p 를 직접 삼차 이징으로 굽혀
// opacity·scale·translateZ 세 값을 동시에 계산한다.
function easeInOutCubic(p: number) {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

export default function CarouselCrossfadeDepth() {
  const carouselRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return undefined;
    const viewport = carousel.querySelector<HTMLDivElement>('.' + styles.viewport);
    const layers = carousel.querySelector<HTMLDivElement>('.' + styles.layers);
    const dotsWrap = carousel.querySelector<HTMLDivElement>('.' + styles.dots);
    const readout = carousel.querySelector<HTMLDivElement>('.' + styles.readout);
    const prevBtn = carousel.querySelector<HTMLButtonElement>('.' + styles['navBtn--prev']);
    const nextBtn = carousel.querySelector<HTMLButtonElement>('.' + styles['navBtn--next']);
    if (!viewport || !layers || !dotsWrap || !readout || !prevBtn || !nextBtn) return undefined;
    const cards = Array.prototype.slice.call(
      layers.querySelectorAll<HTMLDivElement>('.' + styles.card)
    ) as HTMLDivElement[];

    let current = 0;
    let fadeFrame = 0;
    let demoTimers: number[] = [];
    const dots: HTMLButtonElement[] = [];
    const dotClickHandlers: (() => void)[] = [];

    dotsWrap.innerHTML = '';
    for (let i = 0; i < TOTAL; i++) {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = styles.dot;
      d.setAttribute('role', 'tab');
      d.setAttribute('aria-label', GOTO_LABEL_PREFIX + (i + 1) + GOTO_LABEL_SUFFIX);
      const idx = i;
      const handler = () => { human(); goTo(idx); };
      dotClickHandlers.push(handler);
      d.addEventListener('click', handler);
      dotsWrap.appendChild(d);
      dots.push(d);
    }

    function paintStatic() {
      cards.forEach((el, n) => {
        const active = n === current;
        el.style.opacity = active ? '1' : '0';
        el.style.transform = active
          ? 'translateZ(0) scale(1)'
          : 'translateZ(' + -DEPTH_PUSH + 'px) scale(' + (1 - DEPTH_SCALE).toFixed(3) + ')';
        el.style.zIndex = active ? '2' : '1';
      });
      dots.forEach((el, n) => el.classList.toggle(styles.isActive, n === current));
      readout!.textContent = LABEL_PREFIX + (current + 1) + LABEL_SEP + TOTAL;
    }

    function stopFade() {
      if (fadeFrame) { cancelAnimationFrame(fadeFrame); fadeFrame = 0; }
    }

    function goTo(target: number) {
      target = ((target % TOTAL) + TOTAL) % TOTAL;
      if (target === current) return;
      stopFade();
      const from = current, to = target;
      const fromEl = cards[from], toEl = cards[to];
      toEl.style.zIndex = '2';
      fromEl.style.zIndex = '1';
      const start = performance.now();
      function frame(now: number) {
        const raw = Math.min(1, (now - start) / CROSSFADE_MS);
        const p = easeInOutCubic(raw);
        fromEl.style.opacity = (1 - p).toFixed(3);
        fromEl.style.transform = 'translateZ(' + (-p * DEPTH_PUSH).toFixed(1) + 'px) scale(' + (1 - p * DEPTH_SCALE).toFixed(3) + ')';
        toEl.style.opacity = p.toFixed(3);
        toEl.style.transform = 'translateZ(' + (-(1 - p) * DEPTH_PUSH).toFixed(1) + 'px) scale(' + (1 - DEPTH_SCALE + p * DEPTH_SCALE).toFixed(3) + ')';
        if (raw < 1) {
          fadeFrame = requestAnimationFrame(frame);
        } else {
          current = to;
          fadeFrame = 0;
          dots.forEach((el, n) => el.classList.toggle(styles.isActive, n === current));
          readout!.textContent = LABEL_PREFIX + (current + 1) + LABEL_SEP + TOTAL;
        }
      }
      fadeFrame = requestAnimationFrame(frame);
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

    // reduce: 실사용 경로 적용 — 점·버튼·키보드는 위 리스너가 그대로 이징 계산을 돌린다.
    // 아래 demoCycle() 은 시연 게이트만이고 reduce 에서는 돌지 않는다.
    function demoCycle(i: number) {
      if (!carousel!.classList.contains(styles['is-demo'])) return;
      goTo(current + 1);
      demoTimers.push(window.setTimeout(() => demoCycle(i + 1), DEMO_HOLD_MS));
    }

    paintStatic();
    if (!reduce) demoCycle(0);

    return () => {
      prevBtn.removeEventListener('click', onPrev);
      nextBtn.removeEventListener('click', onNext);
      viewport.removeEventListener('keydown', onKeydown);
      dots.forEach((d, i) => d.removeEventListener('click', dotClickHandlers[i]));
      demoTimers.forEach((t) => window.clearTimeout(t));
      stopFade();
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
          <div className={styles.layers}>
            <div className={styles.card + ' ' + styles['card--0']}><span className={styles.num}>1</span></div>
            <div className={styles.card + ' ' + styles['card--1']}><span className={styles.num}>2</span></div>
            <div className={styles.card + ' ' + styles['card--2']}><span className={styles.num}>3</span></div>
            <div className={styles.card + ' ' + styles['card--3']}><span className={styles.num}>4</span></div>
            <div className={styles.card + ' ' + styles['card--4']}><span className={styles.num}>5</span></div>
          </div>
        </div>
        <button type="button" className={styles.navBtn + ' ' + styles['navBtn--prev']} aria-label="이전 카드">
          <svg viewBox="0 0 256 256" width={18} height={18} aria-hidden="true"><g fill="currentColor"><path d="M112 56v144l-72-72Z" opacity=".2" /><path d="M216 120h-96V56a8 8 0 0 0-13.66-5.66l-72 72a8 8 0 0 0 0 11.32l72 72A8 8 0 0 0 120 200v-64h96a8 8 0 0 0 0-16m-112 60.69L51.31 128L104 75.31Z" /></g></svg>
        </button>
        <button type="button" className={styles.navBtn + ' ' + styles['navBtn--next']} aria-label="다음 카드">
          <svg viewBox="0 0 256 256" width={18} height={18} aria-hidden="true"><g fill="currentColor"><path d="m216 128l-72 72V56Z" opacity=".2" /><path d="m221.66 122.34l-72-72A8 8 0 0 0 136 56v64H40a8 8 0 0 0 0 16h96v64a8 8 0 0 0 13.66 5.66l72-72a8 8 0 0 0 0-11.32M152 180.69V75.31L204.69 128Z" /></g></svg>
        </button>
        <div className={styles.dots} role="tablist" aria-label="카드 바로가기"></div>
        <div className={styles.readout} aria-live="polite"></div>
      </section>
    </main>
  );
}
