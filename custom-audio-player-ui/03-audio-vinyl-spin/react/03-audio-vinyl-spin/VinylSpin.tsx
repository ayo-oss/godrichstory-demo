import { useEffect, useRef } from "react";
import styles from "./VinylSpin.module.scss";

export default function VinylSpin() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const playRef = useRef<HTMLButtonElement | null>(null);
  const discRef = useRef<HTMLDivElement | null>(null);
  const armRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const playBtn = playRef.current;
    const disc = discRef.current;
    const arm = armRef.current;
    if (!root || !playBtn || !disc || !arm) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isDemo = true;

    const PLAY_LENGTH_S = 214; // 합성 트랙 길이 — 톤암이 바깥에서 안쪽까지 이동하는 기준 시간
    const TARGET_VELOCITY = 200; // 33+1/3 rpm 을 각속도(도/초)로 환산한 값
    const SPIN_UP_RATE = 0.06; // 정지 상태에서 재생 각속도까지 붙는 속도(프레임당 비율)
    const SPIN_DECAY = 0.965; // 관성 감쇠 값 — 변형: 키우면 일시정지 후 멈추기까지 시간이 길어진다
    const ARM_ANGLE_START = -18; // 바깥쪽 홈(재생 시작 위치)
    const ARM_ANGLE_END = -34; // 안쪽 홈(재생 끝 위치)

    let angle = 0, velocity = 0, progressS = 0, playing = true, demoPlaying = true, last = 0, driveStart = 0;

    function human() { if (isDemo) { root!.classList.remove(styles["is-demo"]); isDemo = false; } }

    function setPlaying(next: boolean) {
      playing = next;
      root!.classList.toggle(styles["is-playing"], next);
    }

    function step(effPlaying: boolean, dt: number) {
      if (effPlaying) {
        velocity += (TARGET_VELOCITY - velocity) * SPIN_UP_RATE;
        progressS = Math.min(PLAY_LENGTH_S, progressS + dt);
      } else {
        velocity *= SPIN_DECAY; // 매 프레임 각속도를 줄여 관성으로 멎는 것처럼 보이게 한다
      }
      angle = (angle + velocity * dt) % 360;
      disc!.style.transform = "rotate(" + angle.toFixed(2) + "deg)";
      const t = progressS / PLAY_LENGTH_S;
      const armAngle = ARM_ANGLE_START + (ARM_ANGLE_END - ARM_ANGLE_START) * t;
      arm!.style.transform = "rotate(" + armAngle.toFixed(2) + "deg)";
    }

    let rafDrive = 0;
    function driveTick(now: number) {
      if (!driveStart) driveStart = now;
      if (isDemo) {
        const DRIVE_PERIOD_MS = 2000; // 렌더 캐처 창(설정 초=2.0)과 같은 주기 — 시연 전용
        const frac = ((now - driveStart) % DRIVE_PERIOD_MS) / DRIVE_PERIOD_MS;
        demoPlaying = frac < 0.6; // 앞 60% 구간 재생, 뒤 40% 구간 정지 → 감쇠 구간을 눈에 보이게 한다
      }
      rafDrive = requestAnimationFrame(driveTick);
    }

    let rafFrame = 0;
    function frame(now: number) {
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      step(isDemo ? demoPlaying : playing, dt);
      rafFrame = requestAnimationFrame(frame);
    }

    function onPlayClick() { human(); setPlaying(!playing); }
    function onPlayKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); human(); setPlaying(!playing); }
    }

    function onReduceClick() {
      human();
      setPlaying(!playing);
      arm!.style.transform = "rotate(" + (playing ? ARM_ANGLE_END : ARM_ANGLE_START) + "deg)";
    }
    function onReduceKeydown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault(); human(); setPlaying(!playing);
        arm!.style.transform = "rotate(" + (playing ? ARM_ANGLE_END : ARM_ANGLE_START) + "deg)";
      }
    }

    if (reduce) {
      root.classList.add(styles["is-still"]);
      disc.style.transform = "rotate(0deg)";
      arm.style.transform = "rotate(" + ARM_ANGLE_START + "deg)";
      playBtn.addEventListener("click", onReduceClick);
      playBtn.addEventListener("keydown", onReduceKeydown);
    } else {
      playBtn.addEventListener("click", onPlayClick);
      playBtn.addEventListener("keydown", onPlayKeydown);
      rafFrame = requestAnimationFrame(frame);
      rafDrive = requestAnimationFrame(driveTick);
    }

    return () => {
      cancelAnimationFrame(rafFrame);
      cancelAnimationFrame(rafDrive);
      if (reduce) {
        playBtn.removeEventListener("click", onReduceClick);
        playBtn.removeEventListener("keydown", onReduceKeydown);
      } else {
        playBtn.removeEventListener("click", onPlayClick);
        playBtn.removeEventListener("keydown", onPlayKeydown);
      }
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.tt + " " + styles["is-demo"] + " " + styles["is-playing"]} ref={rootRef}>
        <p className={styles.hint}><span>재생을 누르면 각속도 값으로 앨범판이 돌고, 일시정지하면 관성으로 서서히 멈춥니다</span></p>
        <div className={styles.panel}>
          <div className={styles.deck}>
            <div className={styles.disc} ref={discRef} />
            <div className={styles.arm} ref={armRef} />
          </div>
          <button className={styles.play} ref={playRef} type="button" aria-label="재생">
            <svg className={`${styles.ico} ${styles.icoPlay}`} aria-hidden="true"><use href="#ico-play" /></svg>
            <svg className={`${styles.ico} ${styles.icoPause}`} aria-hidden="true"><use href="#ico-pause" /></svg>
          </button>
        </div>
      </div>
    </main>
  );
}
