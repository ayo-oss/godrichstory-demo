import { useEffect, useRef } from 'react';
import styles from './CarouselSnapPoints.module.scss';

// 상수 — vanilla demo 07 (run/384/demo/07-carousel-slide-snap-points/index.html) 과 동일
const TOTAL = 5;
const SNAP_EASE = 0.24;        // 목표 스냅 위치로 매 프레임 당기는 비율
const SNAP_STOP = 0.35;
const SAMPLE_WINDOW_MS = 110;
const SNAP_VELOCITY_BIAS = 0.32; // 이 속도(px/ms) 이상으로 놓으면 '가장 가까운 칸' 대신 그 방향의 다음 칸으로 판정한다
const DEMO_FLICKS = [
  { dx: -60, fast: false }, // 느리게 살짝 — 가장 가까운 칸으로
  { dx: -40, fast: true },  // 빠르게 짧게 — 방향의 다음 칸으로(판정이 갈리는 지점)
  { dx: 70, fast: false },
  { dx: 55, fast: true },
];
const DEMO_HOLD_MS = 300;
const LABEL_PREFIX = '카드 ';
const LABEL_SEP = ' / ';

export default function CarouselSnapPoints() {
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

    let pos = 0, minX = 0, maxX = 0, step = 0;
    let dragging = false;
    let samples: { t: number; x: number }[] = [];
    let snapFrame = 0;
    let demoTimers: number[] = [];
    let originPos = 0, startX = 0;

    function bounds() {
      step = track!.scrollWidth / TOTAL;
      maxX = 0;
      minX = Math.min(0, viewport!.clientWidth - track!.scrollWidth);
    }
    function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

    function paint() {
      track!.style.transform = 'translate3d(' + pos.toFixed(1) + 'px,0,0)';
      const idx = clamp(Math.round(-pos / step), 0, TOTAL - 1);
      readout!.textContent = LABEL_PREFIX + (idx + 1) + LABEL_SEP + TOTAL;
    }

    function stopSnap() {
      if (snapFrame) { cancelAnimationFrame(snapFrame); snapFrame = 0; }
    }
    function animateTo(target: number) {
      stopSnap();
      function frame() {
        pos += (target - pos) * SNAP_EASE;
        paint();
        if (Math.abs(target - pos) > SNAP_STOP) {
          snapFrame = requestAnimationFrame(frame);
        } else {
          pos = target;
          paint();
          snapFrame = 0;
        }
      }
      snapFrame = requestAnimationFrame(frame);
    }

    // 계산 겹 — 그냥 가장 가까운 칸이 아니라, 놓는 순간의 속도가 기준(SNAP_VELOCITY_BIAS)을 넘으면
    // '가까운 칸' 판정을 그 방향의 다음 칸으로 밀어 넘긴다(빠르게 짧게 밀어도 다음 칸으로 붙는다).
    function judgeSnapIndex(rawPos: number, velocity: number) {
      const rawIndex = -rawPos / step;
      let idx = Math.round(rawIndex);
      if (Math.abs(velocity) > SNAP_VELOCITY_BIAS) {
        idx += velocity < 0 ? 1 : -1;
      }
      return clamp(idx, 0, TOTAL - 1);
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
      pos = clamp(originPos + dx, minX - step * 0.6, maxX + step * 0.6);
      pushSample(performance.now(), e.clientX);
      paint();
    }
    function onPointerUp(e: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      track!.classList.remove(styles.isDragging);
      try { viewport!.releasePointerCapture(e.pointerId); } catch { /* 캡처가 이미 풀린 경우 */ }
      const velocity = releaseVelocity();
      const idx = judgeSnapIndex(pos, velocity);
      animateTo(-idx * step);
    }
    function stepTo(dir: number) {
      human();
      const idx = clamp(Math.round(-pos / step) + dir, 0, TOTAL - 1);
      animateTo(-idx * step);
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') { stepTo(-1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { stepTo(1); e.preventDefault(); }
    }
    function onPrev() { stepTo(-1); }
    function onNext() { stepTo(1); }
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

    // reduce: 실사용 경로 적용 — 드래그·키보드·버튼은 위 리스너가 그대로 스냅 판정을 돌린다.
    // 아래 demoCycle() 은 시연 게이트만이고 reduce 에서는 돌지 않는다(가짜 포인터 이벤트 없이 같은 판정 함수만 재사용).
    function demoCycle(i: number) {
      if (!carousel!.classList.contains(styles['is-demo'])) return;
      const f = DEMO_FLICKS[i % DEMO_FLICKS.length];
      const velocity = f.fast ? (f.dx < 0 ? -0.5 : 0.5) : (f.dx < 0 ? -0.08 : 0.08);
      const pretend = clamp(pos + f.dx, minX - step * 0.6, maxX + step * 0.6);
      const idx = judgeSnapIndex(pretend, velocity);
      pos = pretend; paint();
      animateTo(-idx * step);
      demoTimers.push(window.setTimeout(() => demoCycle(i + 1), DEMO_HOLD_MS + 260));
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
