import { useEffect, useRef } from "react";
import styles from "./CustomPlayer.module.scss";

export default function CustomPlayer() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const seekRef = useRef<HTMLDivElement | null>(null);
  const playRef = useRef<HTMLButtonElement | null>(null);
  const elapsedRef = useRef<HTMLSpanElement | null>(null);
  const remainRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const fill = fillRef.current;
    const handle = handleRef.current;
    const seek = seekRef.current;
    const playBtn = playRef.current;
    const elapsedEl = elapsedRef.current;
    const remainEl = remainRef.current;
    if (!root || !track || !fill || !handle || !seek || !playBtn || !elapsedEl || !remainEl) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;

    const TRACK_LENGTH_S = 214; // 3:34 — 실 오디오 파일 없음, 합성 트랙 길이 상수
    const SEEK_STEP_S = 5; // 방향키 한 번의 탐색 단위(초)
    const PROGRESS_UPDATE_MS = 200; // 진행률 재계산 주기 — 변형: 이 값을 줄이면 더 잦게 다시 계산해 매끈해진다
    let trackW = 0;

    function fit() {
      const r = track!.getBoundingClientRect();
      const hr = handle!.getBoundingClientRect();
      trackW = Math.max(1, r.width - hr.width);
    }

    function fmt(sec: number) {
      sec = Math.max(0, Math.round(sec));
      const m = Math.floor(sec / 60), s = sec % 60;
      return m + ":" + (s < 10 ? "0" : "") + s;
    }

    function render(elapsedS: number) {
      const p = Math.min(1, Math.max(0, elapsedS / TRACK_LENGTH_S));
      fill!.style.transform = "scaleX(" + p + ")";
      handle!.style.transform = "translateX(" + p * trackW + "px)";
      elapsedEl!.textContent = fmt(elapsedS);
      remainEl!.textContent = "-" + fmt(TRACK_LENGTH_S - elapsedS);
      seek!.setAttribute("aria-valuenow", String(Math.round(p * 100)));
    }

    function human() {
      if (isDemo) { root!.classList.remove(styles["is-demo"]); isDemo = false; }
    }

    const state = { elapsedS: 0, playing: false, playStart: 0, lastRenderMs: -1 };

    function setPlaying(next: boolean) {
      state.playing = next;
      root!.classList.toggle(styles["is-playing"], next);
      if (next) state.playStart = performance.now() - state.elapsedS * 1000;
    }

    function seekTo(elapsedS: number) {
      state.elapsedS = Math.min(TRACK_LENGTH_S, Math.max(0, elapsedS));
      if (state.playing) state.playStart = performance.now() - state.elapsedS * 1000;
      render(state.elapsedS);
    }

    function onTrackClick(e: MouseEvent) {
      human();
      const r = track!.getBoundingClientRect();
      const ratio = (e.clientX - r.left) / r.width;
      seekTo(ratio * TRACK_LENGTH_S);
    }

    function onSeekKeydown(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        human();
        seekTo(state.elapsedS + (e.key === "ArrowRight" ? SEEK_STEP_S : -SEEK_STEP_S));
      }
    }

    function onPlayClick() { human(); setPlaying(!state.playing); }

    let driveStart = 0;
    let rafDrive = 0;
    function driveTick(now: number) {
      if (!driveStart) driveStart = now;
      if (isDemo) {
        const DRIVE_PERIOD_MS = 2000; // 렌더 캐처 창(설정 초=2.0)과 같은 주기 — 시연 전용
        const frac = ((now - driveStart) % DRIVE_PERIOD_MS) / DRIVE_PERIOD_MS;
        if (now - state.lastRenderMs >= PROGRESS_UPDATE_MS) {
          render(frac * TRACK_LENGTH_S);
          state.lastRenderMs = now;
        }
      }
      rafDrive = requestAnimationFrame(driveTick);
    }

    let rafFrame = 0;
    function frame(now: number) {
      if (!isDemo) {
        if (state.playing) {
          let elapsedS = (now - state.playStart) / 1000;
          if (elapsedS >= TRACK_LENGTH_S) { state.playStart = now; elapsedS = 0; }
          state.elapsedS = elapsedS;
        }
        if (now - state.lastRenderMs >= PROGRESS_UPDATE_MS) {
          render(state.elapsedS);
          state.lastRenderMs = now;
        }
      }
      rafFrame = requestAnimationFrame(frame);
    }

    function onReduceClick() { human(); setPlaying(!state.playing); render(state.elapsedS); }

    window.addEventListener("resize", fit);
    fit();

    if (reduce) {
      root.classList.add(styles["is-still"]);
      render(0);
      playBtn.addEventListener("click", onReduceClick);
      track.addEventListener("click", onTrackClick);
      seek.addEventListener("keydown", onSeekKeydown);
    } else {
      playBtn.addEventListener("click", onPlayClick);
      track.addEventListener("click", onTrackClick);
      seek.addEventListener("keydown", onSeekKeydown);
      rafFrame = requestAnimationFrame(frame);
      rafDrive = requestAnimationFrame(driveTick);
    }

    return () => {
      window.removeEventListener("resize", fit);
      cancelAnimationFrame(rafFrame);
      cancelAnimationFrame(rafDrive);
      if (reduce) {
        playBtn.removeEventListener("click", onReduceClick);
      } else {
        playBtn.removeEventListener("click", onPlayClick);
      }
      track.removeEventListener("click", onTrackClick);
      seek.removeEventListener("keydown", onSeekKeydown);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cp + ' ' + styles['is-demo'] + ' ' + styles['is-playing']} ref={rootRef}>
        <p className={styles.hint}>
          <span>재생을 누르면 경과 시간 값으로 손잡이 위치와 남은 시간이 다시 계산됩니다</span>
        </p>
        <div className={styles.panel}>
          <div className={styles.title}>Untitled Session</div>
          <div className={styles.row}>
            <button className={styles.play} ref={playRef} type="button" aria-label="재생">
              <svg className={`${styles.ico} ${styles.icoPlay}`} aria-hidden="true"><use href="#ico-play" /></svg>
              <svg className={`${styles.ico} ${styles.icoPause}`} aria-hidden="true"><use href="#ico-pause" /></svg>
            </button>
            <div
              className={styles.seek}
              ref={seekRef}
              tabIndex={0}
              role="slider"
              aria-label="탐색 막대"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={0}
            >
              <div className={styles.track} ref={trackRef}>
                <div className={styles.fill} ref={fillRef} />
                <div className={styles.handle} ref={handleRef} />
              </div>
            </div>
          </div>
          <div className={styles.time}>
            <span ref={elapsedRef}>0:00</span>
            <span ref={remainRef}>-3:34</span>
          </div>
        </div>
      </div>
    </main>
  );
}
