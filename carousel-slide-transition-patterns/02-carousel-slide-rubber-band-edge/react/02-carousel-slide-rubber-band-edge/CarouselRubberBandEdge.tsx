import { useEffect, useRef } from 'react';
import styles from './CarouselRubberBandEdge.module.scss';

// 상수 — vanilla demo 02 (run/384/demo/02-carousel-slide-rubber-band-edge/index.html) 과 동일
// 고무줄 저항 범위 — 경계를 넘는 거리가 아무리 커져도 시각적으로는 이 값(px)에 점근한다.
const RUBBER_BAND_RANGE = 64;
const SPRING_STIFFNESS = 0.22; // 목표까지 당기는 힘의 비율
const SPRING_DAMPING = 0.72;   // 매 프레임 속도에 곱하는 감쇠(마찰)
const SPRING_STOP = 0.4;       // 이 이하로 좁혀지면 스프링 정지
const DEMO_PUSH_PX = 46;
const DEMO_HOLD_MS = 260;
const TOTAL = 5;
const LABEL_PREFIX = '카드 ';
const LABEL_SEP = ' / ';

export default function CarouselRubberBandEdge() {
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

    let pos = 0, minX = 0, maxX = 0;
    let dragging = false;
    let springFrame = 0;
    let demoTimers: number[] = [];
    let originPos = 0, startX = 0;

    function bounds() {
      maxX = 0;
      minX = Math.min(0, viewport!.clientWidth - track!.scrollWidth);
    }
    function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

    // 고무줄 감쇠 함수 — 넘어간 거리 o(항상 0 이상)를 RUBBER_BAND_RANGE 에 점근하는 곡선으로 눌러준다.
    function rubber(o: number) {
      return RUBBER_BAND_RANGE * o / (RUBBER_BAND_RANGE + o);
    }

    function rawToVisual(raw: number) {
      if (raw > maxX) return maxX + rubber(raw - maxX);
      if (raw < minX) return minX - rubber(minX - raw);
      return raw;
    }

    function paint() {
      track!.style.transform = 'translate3d(' + pos.toFixed(1) + 'px,0,0)';
      const step = track!.scrollWidth / TOTAL;
      const idx = clamp(Math.round(-clamp(pos, minX, maxX) / step), 0, TOTAL - 1);
      readout!.textContent = LABEL_PREFIX + (idx + 1) + LABEL_SEP + TOTAL;
    }

    function stopSpring() {
      if (springFrame) { cancelAnimationFrame(springFrame); springFrame = 0; }
    }

    // 스프링 복귀 — pos 가 경계를 넘은 채로 있을 때만 목표(가까운 경계)까지 힘·감쇠로 당겨 돌아온다.
    function springBackIfNeeded() {
      const target = pos > maxX ? maxX : (pos < minX ? minX : null);
      if (target === null) return;
      const t: number = target;
      let velocity = 0;
      function frame() {
        const force = (t - pos) * SPRING_STIFFNESS;
        velocity = (velocity + force) * SPRING_DAMPING;
        pos += velocity;
        paint();
        if (Math.abs(velocity) > SPRING_STOP || Math.abs(t - pos) > SPRING_STOP) {
          springFrame = requestAnimationFrame(frame);
        } else {
          pos = t;
          paint();
          springFrame = 0;
        }
      }
      springFrame = requestAnimationFrame(frame);
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
      stopSpring();
      dragging = true;
      track!.classList.add(styles.isDragging);
      viewport!.setPointerCapture(e.pointerId);
      originPos = pos;
      startX = e.clientX;
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      pos = rawToVisual(originPos + dx);
      paint();
    }
    function onPointerUp(e: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      track!.classList.remove(styles.isDragging);
      try { viewport!.releasePointerCapture(e.pointerId); } catch { /* 캡처가 이미 풀린 경우 */ }
      springBackIfNeeded();
    }
    function step(dir: number) {
      human();
      stopSpring();
      const stepPx = track!.scrollWidth / TOTAL;
      pos = rawToVisual(clamp(pos + dir * -stepPx, minX - RUBBER_BAND_RANGE, maxX + RUBBER_BAND_RANGE));
      paint();
      springBackIfNeeded();
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
    }
    function onPrev() { step(-1); }
    function onNext() { step(1); }
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

    // reduce: 실사용 경로 적용 — 드래그·키보드·버튼은 위 리스너가 그대로 고무줄 계산을 돌린다.
    // 아래 demoCycle() 은 시연 게이트만이고 reduce 에서는 돌지 않는다.
    function pushAndRelease(target: number, onDone: () => void) {
      const start = performance.now();
      const from = pos;
      function frame(now: number) {
        if (!carousel!.classList.contains(styles['is-demo'])) return;
        const p = Math.min(1, (now - start) / 220);
        pos = from + (target - from) * p;
        paint();
        if (p < 1) requestAnimationFrame(frame);
        else {
          springBackIfNeeded();
          demoTimers.push(window.setTimeout(onDone, DEMO_HOLD_MS + 260));
        }
      }
      requestAnimationFrame(frame);
    }
    function demoCycle(i: number) {
      if (!carousel!.classList.contains(styles['is-demo'])) return;
      if (i % 2 === 0) {
        pos = maxX; paint();
        pushAndRelease(maxX + DEMO_PUSH_PX, () => demoCycle(i + 1));
      } else {
        pos = minX; paint();
        pushAndRelease(minX - DEMO_PUSH_PX, () => demoCycle(i + 1));
      }
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
      stopSpring();
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
