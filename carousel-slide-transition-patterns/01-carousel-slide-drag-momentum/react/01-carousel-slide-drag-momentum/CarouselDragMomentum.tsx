import { useEffect, useRef } from 'react';
import styles from './CarouselDragMomentum.module.scss';

// 상수 — vanilla demo 01 (run/384/demo/01-carousel-slide-drag-momentum/index.html) 과 동일
const STEP_MS = 16.6667;
// 관성 감쇠 계수 — 프레임(16.6667ms)마다 이 비율만큼 속도가 깎인다. 낮출수록 손을 뗀 뒤
// 카드가 더 오래·더 멀리 미끄러진다(변형 1). 높이면 짧게 미끄러지다 빨리 멈춘다.
const MOMENTUM_FRICTION = 0.10;
const VELOCITY_STOP = 0.02;      // px/ms 미만이면 정지로 본다
const SAMPLE_WINDOW_MS = 110;    // 이 시간 안의 포인터 표본만 속도 계산에 쓴다
const KEY_FLICK_VELOCITY = 0.62; // 화살표 키 한 번 = 이 속도의 플릭
const DEMO_FLICKS = [-0.85, 0.5, -0.62, 0.78]; // 자동 시연이 번갈아 쏘는 플릭 속도(px/ms)
const DEMO_HOLD_MS = 260;
const TOTAL = 5;
const LABEL_PREFIX = '카드 ';
const LABEL_SEP = ' / ';

export default function CarouselDragMomentum() {
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

    let pos = 0;          // 현재 translateX (px)
    let velocity = 0;      // px/ms
    let minX = 0, maxX = 0;
    let dragging = false;
    let samples: { t: number; x: number }[] = [];
    let settleFrame = 0;
    let demoTimers: number[] = [];
    let originPos = 0, startX = 0;

    function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

    function bounds() {
      maxX = 0;
      minX = Math.min(0, viewport!.clientWidth - track!.scrollWidth);
    }

    function paint() {
      track!.style.transform = 'translate3d(' + pos.toFixed(1) + 'px,0,0)';
      const step = track!.scrollWidth / TOTAL;
      const idx = clamp(Math.round(-pos / step), 0, TOTAL - 1);
      readout!.textContent = LABEL_PREFIX + (idx + 1) + LABEL_SEP + TOTAL;
    }

    function stopSettle() {
      if (settleFrame) { cancelAnimationFrame(settleFrame); settleFrame = 0; }
    }

    function human() {
      if (carousel!.classList.contains(styles['is-demo'])) {
        carousel!.classList.remove(styles['is-demo']);
        demoTimers.forEach((t) => window.clearTimeout(t));
        demoTimers = [];
      }
    }

    // 관성 감쇠 루프 — 매 프레임 pos += velocity*dt, velocity *= (1-MOMENTUM_FRICTION)^(dt/16.6667).
    // 경계에 닿으면 그 자리에서 속도를 0으로 끊는다(되튕김은 이 항목의 역할이 아니다 — 02가 담당).
    function settle() {
      let last = performance.now();
      function frame(now: number) {
        const dt = Math.min(40, now - last);
        last = now;
        pos = clamp(pos + velocity * dt, minX, maxX);
        const decay = Math.pow(1 - MOMENTUM_FRICTION, dt / STEP_MS);
        velocity *= decay;
        if (pos === minX || pos === maxX) velocity = 0;
        paint();
        if (Math.abs(velocity) > VELOCITY_STOP) {
          settleFrame = requestAnimationFrame(frame);
        } else {
          velocity = 0;
          settleFrame = 0;
        }
      }
      settleFrame = requestAnimationFrame(frame);
    }

    function pushSample(t: number, x: number) {
      samples.push({ t, x });
      while (samples.length && t - samples[0].t > SAMPLE_WINDOW_MS) samples.shift();
    }

    function releaseVelocity() {
      if (samples.length < 2) return 0;
      const a = samples[0], b = samples[samples.length - 1];
      const dt = b.t - a.t;
      if (dt <= 0) return 0;
      return (b.x - a.x) / dt;
    }

    function onPointerDown(e: PointerEvent) {
      human();
      stopSettle();
      dragging = true;
      velocity = 0;
      samples = [];
      track!.classList.add(styles.isDragging);
      viewport!.setPointerCapture(e.pointerId);
      pushSample(performance.now(), e.clientX);
      originPos = pos;
      startX = e.clientX;
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      pos = clamp(originPos + dx, minX, maxX);
      pushSample(performance.now(), e.clientX);
      paint();
    }
    function onPointerUp(e: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      track!.classList.remove(styles.isDragging);
      try { viewport!.releasePointerCapture(e.pointerId); } catch { /* 캡처가 이미 풀린 경우 */ }
      velocity = releaseVelocity();
      settle();
    }
    function flick(v: number) {
      human();
      stopSettle();
      velocity = v;
      settle();
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') { flick(-KEY_FLICK_VELOCITY); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { flick(KEY_FLICK_VELOCITY); e.preventDefault(); }
    }
    function onPrev() { flick(-KEY_FLICK_VELOCITY); }
    function onNext() { flick(KEY_FLICK_VELOCITY); }
    function onResize() { bounds(); }

    viewport.addEventListener('pointerdown', onPointerDown);
    viewport.addEventListener('pointermove', onPointerMove);
    viewport.addEventListener('pointerup', onPointerUp);
    viewport.addEventListener('pointercancel', onPointerUp);
    viewport.addEventListener('keydown', onKeydown);
    prevBtn.addEventListener('click', onPrev);
    nextBtn.addEventListener('click', onNext);
    window.addEventListener('resize', onResize);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // reduce: 실사용 경로 적용 — 드래그·키보드·버튼 플릭은 위 리스너가 그대로 물리 계산을 돌린다.
    // 아래 demoCycle() 은 시연 게이트만이고 reduce 에서는 돌지 않는다.
    function demoCycle(i: number) {
      if (!carousel!.classList.contains(styles['is-demo'])) return;
      velocity = DEMO_FLICKS[i % DEMO_FLICKS.length];
      stopSettle();
      settle();
      demoTimers.push(window.setTimeout(() => {
        demoTimers.push(window.setTimeout(() => demoCycle(i + 1), DEMO_HOLD_MS));
      }, 40));
    }

    bounds();
    paint();
    if (!reduce) demoCycle(0);

    return () => {
      viewport.removeEventListener('pointerdown', onPointerDown);
      viewport.removeEventListener('pointermove', onPointerMove);
      viewport.removeEventListener('pointerup', onPointerUp);
      viewport.removeEventListener('pointercancel', onPointerUp);
      viewport.removeEventListener('keydown', onKeydown);
      prevBtn.removeEventListener('click', onPrev);
      nextBtn.removeEventListener('click', onNext);
      window.removeEventListener('resize', onResize);
      demoTimers.forEach((t) => window.clearTimeout(t));
      stopSettle();
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
        <div className={styles.readout} aria-live="polite"></div>
      </section>
    </main>
  );
}
