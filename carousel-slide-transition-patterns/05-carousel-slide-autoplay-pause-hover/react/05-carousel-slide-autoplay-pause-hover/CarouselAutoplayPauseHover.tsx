import { useEffect, useRef } from 'react';
import styles from './CarouselAutoplayPauseHover.module.scss';

// 상수 — vanilla demo 05 (run/384/demo/05-carousel-slide-autoplay-pause-hover/index.html) 과 동일
const TOTAL = 5;
const AUTOPLAY_MS = 1350;      // 슬라이드 한 장이 보이는 실제 지속 시간(ms) — progressFill 이 이 값까지 채워지면 넘어간다
const DEMO_HOVER_AT_MS = 600;  // 시연: 1주기 중간쯤에서 실제 hovering 상태를 켜 남은 시간 보존을 보여준다
const DEMO_HOVER_DUR_MS = 520;
const LABEL_PREFIX = '카드 ';
const LABEL_SEP = ' / ';
const PAUSE_LABEL = '자동재생 멈춤';
const RESUME_LABEL = '자동재생 다시 시작';

export default function CarouselAutoplayPauseHover() {
  const carouselRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return undefined;
    const viewport = carousel.querySelector<HTMLDivElement>('.' + styles.viewport);
    const slidesEl = carousel.querySelector<HTMLDivElement>('.' + styles.slides);
    const progressFill = carousel.querySelector<HTMLDivElement>('.' + styles.progressFill);
    const readout = carousel.querySelector<HTMLDivElement>('.' + styles.readout);
    const prevBtn = carousel.querySelector<HTMLButtonElement>('.' + styles['navBtn--prev']);
    const nextBtn = carousel.querySelector<HTMLButtonElement>('.' + styles['navBtn--next']);
    const playBtn = carousel.querySelector<HTMLButtonElement>('.' + styles.playBtn);
    if (!viewport || !slidesEl || !progressFill || !readout || !prevBtn || !nextBtn || !playBtn) return undefined;
    const slides = Array.prototype.slice.call(
      slidesEl.querySelectorAll<HTMLDivElement>('.' + styles.slide)
    ) as HTMLDivElement[];
    const iconPause = playBtn.querySelector<SVGElement>('.' + styles['icon--pause']);
    const iconPlay = playBtn.querySelector<SVGElement>('.' + styles['icon--play']);
    if (!iconPause || !iconPlay) return undefined;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let current = 0;
    let playing = !reduce;   // reduce 면 처음부터 완전히 꺼둔다(실사용 경로 자체가 재생하지 않는다)
    let hovering = false;
    let elapsed = 0;         // 이번 슬라이드에 머문 누적 시간(ms) — hovering 동안은 늘지 않는다(남은 시간 보존)
    let lastTick = 0;
    let rafId = 0;
    let demoTimers: number[] = [];

    function showSlide(i: number) {
      slides.forEach((el, n) => el.classList.toggle(styles.isActive, n === i));
      readout!.textContent = LABEL_PREFIX + (i + 1) + LABEL_SEP + TOTAL;
    }
    function advance() {
      current = (current + 1) % TOTAL;
      showSlide(current);
      elapsed = 0;
    }
    function setPlayingUI() {
      playBtn!.setAttribute('aria-pressed', playing ? 'false' : 'true');
      playBtn!.setAttribute('aria-label', playing ? PAUSE_LABEL : RESUME_LABEL);
      iconPause!.classList.toggle(styles.isHidden, !playing);
      iconPlay!.classList.toggle(styles.isHidden, playing);
    }

    // 계산 겹 — 매 프레임 dt 를 elapsed 에 더하되, hovering(또는 !playing) 이면 더하지 않는다.
    // 그래서 다시 풀렸을 때 처음부터가 아니라 멈췄던 그 지점부터 이어서 채워진다(남은 시간 보존).
    function tick(now: number) {
      if (!lastTick) lastTick = now;
      const dt = Math.min(48, now - lastTick);
      lastTick = now;
      if (playing && !hovering && !reduce) {
        elapsed += dt;
        if (elapsed >= AUTOPLAY_MS) { advance(); }
      }
      progressFill!.style.width = (Math.min(1, elapsed / AUTOPLAY_MS) * 100).toFixed(1) + '%';
      rafId = requestAnimationFrame(tick);
    }

    function goTo(i: number) {
      current = ((i % TOTAL) + TOTAL) % TOTAL;
      showSlide(current);
      elapsed = 0;
    }
    function manualNav(dir: number) {
      goTo(current + dir);
    }
    function onPrev() { manualNav(-1); }
    function onNext() { manualNav(1); }
    function onPlayClick() {
      playing = !playing;
      lastTick = 0;
      setPlayingUI();
    }
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') { manualNav(-1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { manualNav(1); e.preventDefault(); }
      else if (e.key === ' ' || e.key === 'Enter') {
        if (document.activeElement === playBtn) return;
        playing = !playing; lastTick = 0; setPlayingUI(); e.preventDefault();
      }
    }
    function onMouseEnter() { hovering = true; }
    function onMouseLeave() { hovering = false; lastTick = 0; }

    prevBtn.addEventListener('click', onPrev);
    nextBtn.addEventListener('click', onNext);
    playBtn.addEventListener('click', onPlayClick);
    viewport.addEventListener('keydown', onKeydown);
    viewport.addEventListener('mouseenter', onMouseEnter);
    viewport.addEventListener('mouseleave', onMouseLeave);

    // reduce: 실사용 경로 적용 — tick() 이 이미 playing=false·reduce 체크로 진행을 막는다(progressTrack 은 scss 에서 숨김).
    // 아래는 시연 전용 — is-demo 동안 실제 hovering 변수를 타이머로 잠깐 켜서 '남은 시간 보존'을 보여준다.
    function demoHoverPulse() {
      if (!carousel!.classList.contains(styles['is-demo']) || reduce) return;
      demoTimers.push(window.setTimeout(() => {
        hovering = true;
        demoTimers.push(window.setTimeout(() => {
          hovering = false;
          lastTick = 0;
        }, DEMO_HOVER_DUR_MS));
      }, DEMO_HOVER_AT_MS));
    }

    showSlide(0);
    setPlayingUI();
    if (!reduce) {
      demoHoverPulse();
      rafId = requestAnimationFrame(tick);
    } else {
      progressFill.style.width = '0%';
    }

    return () => {
      prevBtn.removeEventListener('click', onPrev);
      nextBtn.removeEventListener('click', onNext);
      playBtn.removeEventListener('click', onPlayClick);
      viewport.removeEventListener('keydown', onKeydown);
      viewport.removeEventListener('mouseenter', onMouseEnter);
      viewport.removeEventListener('mouseleave', onMouseLeave);
      demoTimers.forEach((t) => window.clearTimeout(t));
      if (rafId) cancelAnimationFrame(rafId);
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
          <div className={styles.slides}>
            <div className={styles.slide + ' ' + styles.isActive + ' ' + styles['card--0']}><span className={styles.num}>1</span></div>
            <div className={styles.slide + ' ' + styles['card--1']}><span className={styles.num}>2</span></div>
            <div className={styles.slide + ' ' + styles['card--2']}><span className={styles.num}>3</span></div>
            <div className={styles.slide + ' ' + styles['card--3']}><span className={styles.num}>4</span></div>
            <div className={styles.slide + ' ' + styles['card--4']}><span className={styles.num}>5</span></div>
          </div>
          <div className={styles.progressTrack}><div className={styles.progressFill}></div></div>
        </div>
        <button type="button" className={styles.navBtn + ' ' + styles['navBtn--prev']} aria-label="이전 카드">
          <svg viewBox="0 0 256 256" width={18} height={18} aria-hidden="true"><g fill="currentColor"><path d="M112 56v144l-72-72Z" opacity=".2" /><path d="M216 120h-96V56a8 8 0 0 0-13.66-5.66l-72 72a8 8 0 0 0 0 11.32l72 72A8 8 0 0 0 120 200v-64h96a8 8 0 0 0 0-16m-112 60.69L51.31 128L104 75.31Z" /></g></svg>
        </button>
        <button type="button" className={styles.navBtn + ' ' + styles['navBtn--next']} aria-label="다음 카드">
          <svg viewBox="0 0 256 256" width={18} height={18} aria-hidden="true"><g fill="currentColor"><path d="m216 128l-72 72V56Z" opacity=".2" /><path d="m221.66 122.34l-72-72A8 8 0 0 0 136 56v64H40a8 8 0 0 0 0 16h96v64a8 8 0 0 0 13.66 5.66l72-72a8 8 0 0 0 0-11.32M152 180.69V75.31L204.69 128Z" /></g></svg>
        </button>
        <button type="button" className={styles.playBtn} aria-label="자동재생 멈춤" aria-pressed="false">
          <svg className={styles.icon + ' ' + styles['icon--pause']} viewBox="0 0 256 256" width={16} height={16} aria-hidden="true"><g fill="currentColor"><path d="M208 48v160a8 8 0 0 1-8 8h-40a8 8 0 0 1-8-8V48a8 8 0 0 1 8-8h40a8 8 0 0 1 8 8M96 40H56a8 8 0 0 0-8 8v160a8 8 0 0 0 8 8h40a8 8 0 0 0 8-8V48a8 8 0 0 0-8-8" opacity=".2" /><path d="M200 32h-40a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h40a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16m0 176h-40V48h40ZM96 32H56a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h40a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16m0 176H56V48h40Z" /></g></svg>
          <svg className={styles.icon + ' ' + styles['icon--play'] + ' ' + styles.isHidden} viewBox="0 0 256 256" width={16} height={16} aria-hidden="true"><g fill="currentColor"><path d="M228.23 134.69L84.15 222.81A8 8 0 0 1 72 216.12V39.88a8 8 0 0 1 12.15-6.69l144.08 88.12a7.82 7.82 0 0 1 0 13.38" opacity=".2" /><path d="M232.4 114.49L88.32 26.35a16 16 0 0 0-16.2-.3A15.86 15.86 0 0 0 64 39.87v176.26A15.94 15.94 0 0 0 80 232a16.07 16.07 0 0 0 8.36-2.35l144.04-88.14a15.81 15.81 0 0 0 0-27ZM80 215.94V40l143.83 88Z" /></g></svg>
        </button>
        <div className={styles.readout} aria-live="polite"></div>
      </section>
    </main>
  );
}
