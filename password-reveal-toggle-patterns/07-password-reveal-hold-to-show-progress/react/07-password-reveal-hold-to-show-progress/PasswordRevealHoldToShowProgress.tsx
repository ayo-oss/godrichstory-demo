import { useEffect, useRef } from "react";
import styles from "./PasswordRevealHoldToShowProgress.module.scss";

export default function PasswordRevealHoldToShowProgress() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const ringFgRef = useRef<SVGCircleElement>(null);
  const lidTopRef = useRef<SVGPathElement>(null);
  const lidBottomRef = useRef<SVGPathElement>(null);
  const pupilRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const input = inputRef.current;
    const btn = btnRef.current;
    const ringFg = ringFgRef.current;
    const lidTop = lidTopRef.current;
    const lidBottom = lidBottomRef.current;
    const pupil = pupilRef.current;
    if (!root || !input || !btn || !ringFg || !lidTop || !lidBottom || !pupil) return;

    const HOLD_DURATION_MS = 900;
    const EYE_OPEN_MS = 220;
    const RING_R = 18;
    const CIRCUMFERENCE = 2 * Math.PI * RING_R;
    ringFg.style.strokeDasharray = String(CIRCUMFERENCE);
    ringFg.style.strokeDashoffset = String(CIRCUMFERENCE);

    function seedRand(seed: number) {
      let s = seed >>> 0;
      return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    const pwRand = seedRand(426072);
    const PW_POOL = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    function pickPassword(len: number) {
      let out = "";
      for (let i = 0; i < len; i += 1) out += PW_POOL[Math.floor(pwRand() * PW_POOL.length)];
      return out;
    }
    input.value = pickPassword(10);

    function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

    function setEye(progress: number) {
      const eased = easeOutCubic(progress);
      const lift = 8 * eased;
      lidTop!.setAttribute("d", "M2,12 Q12," + (12 - lift) + " 22,12");
      lidBottom!.setAttribute("d", "M2,12 Q12," + (12 + lift) + " 22,12");
      pupil!.style.opacity = String(eased);
    }
    setEye(0);

    let holding = false;
    let revealed = false;
    let holdStart = 0;
    let rafId = 0;

    function setRing(progress: number) {
      ringFg!.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - progress));
      root!.style.setProperty('--phr-progress', String(progress));
    }

    function loop(ts: number) {
      if (!holding) return;
      const elapsed = ts - holdStart;
      const progress = Math.max(0, Math.min(1, elapsed / HOLD_DURATION_MS));
      setRing(progress);
      if (progress >= 1 && !revealed) {
        revealed = true;
        input!.type = "text";
        btn!.setAttribute("aria-pressed", "true");
      }
      const eyeProgress = revealed ? 1 : Math.max(0, Math.min(1, elapsed / EYE_OPEN_MS));
      setEye(eyeProgress);
      rafId = requestAnimationFrame(loop);
    }

    function startHold() {
      if (holding) return;
      holding = true;
      revealed = false;
      holdStart = performance.now();
      rafId = requestAnimationFrame(loop);
    }

    function endHold() {
      if (!holding) return;
      holding = false;
      revealed = false;
      input!.type = "password";
      btn!.setAttribute("aria-pressed", "false");
      setRing(0);
      setEye(0);
      cancelAnimationFrame(rafId);
    }

    function onPointerDown(e: PointerEvent) { e.preventDefault(); startHold(); }
    function onPointerEnd() { endHold(); }
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      e.preventDefault();
      if (e.repeat) return;
      startHold();
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      e.preventDefault();
      endHold();
    }

    btn.addEventListener("pointerdown", onPointerDown);
    btn.addEventListener("pointerup", onPointerEnd);
    btn.addEventListener("pointercancel", onPointerEnd);
    btn.addEventListener("pointerleave", onPointerEnd);
    btn.addEventListener("keydown", onKeyDown);
    btn.addEventListener("keyup", onKeyUp);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) root.classList.remove("is-demo");

    let demoTimer = 0;
    function demoLoop() {
      if (!root!.classList.contains("is-demo")) return;
      startHold();
      demoTimer = window.setTimeout(function () {
        endHold();
        demoTimer = window.setTimeout(demoLoop, 1300);
      }, HOLD_DURATION_MS + 400);
    }
    if (!reduce) demoTimer = window.setTimeout(demoLoop, 200);

    return () => {
      btn.removeEventListener("pointerdown", onPointerDown);
      btn.removeEventListener("pointerup", onPointerEnd);
      btn.removeEventListener("pointercancel", onPointerEnd);
      btn.removeEventListener("pointerleave", onPointerEnd);
      btn.removeEventListener("keydown", onKeyDown);
      btn.removeEventListener("keyup", onKeyUp);
      cancelAnimationFrame(rafId);
      window.clearTimeout(demoTimer);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.phr} is-demo`} ref={rootRef}>
        <label className={styles.phr__label} htmlFor="phrInputReact">비밀번호</label>
        <div className={styles.phr__field}>
          <input className={styles.phr__input} id="phrInputReact" type="password" aria-describedby="phrHintReact" ref={inputRef} readOnly />
          <button className={styles.phr__btn} type="button" aria-pressed="false" aria-label="길게 눌러 비밀번호 보기" ref={btnRef}>
            <svg className={styles.phr__ring} viewBox="0 0 44 44" width={40} height={40} aria-hidden="true">
              <circle className={styles.phr__ringTrack} cx={22} cy={22} r={18} fill="none" strokeWidth={3} />
              <circle className={styles.phr__ringFg} ref={ringFgRef} cx={22} cy={22} r={18} fill="none" strokeWidth={3} strokeLinecap="round" />
            </svg>
            <svg className={styles.phr__eye} viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
              <path className={styles.phr__lidTop} ref={lidTopRef} d="M2,12 Q12,4 22,12" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              <path className={styles.phr__lidBottom} ref={lidBottomRef} d="M2,12 Q12,20 22,12" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              <circle className={styles.phr__pupil} ref={pupilRef} cx={12} cy={12} r={3.2} fill="currentColor" />
            </svg>
          </button>
        </div>
        <p className={styles.phr__hint} id="phrHintReact">누르고 있는 시간만큼 링이 채워지면 문자가 열리고, 손을 떼면 즉시 다시 닫힌다</p>
      </div>
    </main>
  );
}
