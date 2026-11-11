import { useEffect, useRef } from "react";
import styles from "./SpinDiceSceneFlatFaceTumble.module.scss";

export default function SpinDiceSceneFlatFaceTumble() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const numRef = useRef<HTMLElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const dieRef = useRef<HTMLDivElement | null>(null);
  const floorRef = useRef<HTMLDivElement | null>(null);
  const hopRef = useRef<HTMLDivElement | null>(null);
  const squeezeRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const r0 = rootRef.current, l0 = labelRef.current, n0 = numRef.current, b0 = btnRef.current;
    const d0 = dieRef.current, f0 = floorRef.current, h0 = hopRef.current, s0 = squeezeRef.current, sh0 = shadowRef.current;
    if (!r0 || !l0 || !n0 || !b0 || !d0 || !f0 || !h0 || !s0 || !sh0) return;
    const root: HTMLDivElement = r0;
    const labelEl: HTMLElement = l0;
    const numEl: HTMLElement = n0;
    const btn: HTMLButtonElement = b0;
    const dieEl: HTMLDivElement = d0;
    const floorEl: HTMLDivElement = f0;
    const hopEl: HTMLDivElement = h0;
    const squeezeEl: HTMLDivElement = s0;
    const shadowEl: HTMLDivElement = sh0;

    type Fn = () => void;
    type RandFn = () => number;
    var DICE_SEED = 7;
    var HOP_MS = 360;
    var HOP_COUNT = 4;
    var TILE_PX = 128;
    var T_RESULT = '결과';
    var T_ROLLING = '굴리는 중';
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var demo = !reduce;
    if (!demo) root.classList.remove('is-demo');
    function stopDemo(): void { demo = false; root.classList.remove('is-demo'); }
    function seedRand(seed: number): RandFn {
      var s = seed >>> 0;
      return function (): number { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }
    var rng = seedRand(DICE_SEED + 8);
    var timers: number[] = [];
    var cleaners: Fn[] = [];
    var stLabel = '', stNum = '';
    function setStatus(label: string, num: string): void {
      if (label === stLabel && num === stNum) return;
      stLabel = label; stNum = num;
      labelEl.textContent = label;
      numEl.textContent = num;
    }
    // 기법: 면 한 장의 가로 폭을 scaleX 로 줄였다 늘리는 동안(납작해지는 순간) 눈 수 레이어를 바꿔 끼운다.
    // 바닥 줄무늬를 한 칸(TILE_PX)씩 밀면 주사위는 제자리에서 튀기고 바닥이 굴러 가는 것처럼 보인다.
    function clearTimers(): void {
      for (var i = 0; i < timers.length; i += 1) window.clearTimeout(timers[i]);
      timers = [];
    }
    function pickFaces(): number[] {
      var seq: number[] = [];
      var prev = Number(dieEl.getAttribute('data-face')) || 2;
      for (var k = 0; k < HOP_COUNT; k += 1) {
        var f = 1 + Math.floor(rng() * 6);
        if (f === prev) f = (f % 6) + 1;
        seq.push(f);
        prev = f;
      }
      return seq;
    }
    function onRoll(): void {
      stopDemo();
      clearTimers();
      var running = [floorEl, hopEl, squeezeEl, shadowEl];
      for (var r = 0; r < running.length; r += 1) {
        var an = running[r].getAnimations();
        for (var q = 0; q < an.length; q += 1) an[q].cancel();
      }
      var seq = pickFaces();
      var last = seq[seq.length - 1];
      if (reduce) {
        dieEl.setAttribute('data-face', String(last));
        setStatus(T_RESULT, String(last));
        return;
      }
      setStatus(T_ROLLING, '');
      var span = HOP_MS * HOP_COUNT;
      floorEl.animate([{ transform: 'translateX(0px)' }, { transform: 'translateX(-' + (TILE_PX * HOP_COUNT) + 'px)' }], { duration: span, easing: 'ease-in-out' });
      hopEl.animate([{ transform: 'translateY(0px)' }, { transform: 'translateY(-28px)', offset: 0.5 }, { transform: 'translateY(0px)' }], { duration: HOP_MS, iterations: HOP_COUNT, easing: 'ease-out' });
      squeezeEl.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0.18)', offset: 0.5 }, { transform: 'scaleX(1)' }], { duration: HOP_MS, iterations: HOP_COUNT, easing: 'ease-in-out' });
      shadowEl.animate([{ transform: 'scale(1)', opacity: 0.5 }, { transform: 'scale(0.6)', opacity: 0.25, offset: 0.5 }, { transform: 'scale(1)', opacity: 0.5 }], { duration: HOP_MS, iterations: HOP_COUNT, easing: 'ease-out' });
      for (var k = 0; k < HOP_COUNT; k += 1) {
        (function (face: number, at: number): void {
          timers.push(window.setTimeout(function (): void { dieEl.setAttribute('data-face', String(face)); }, at));
        })(seq[k], Math.round((k + 0.5) * HOP_MS));
      }
      timers.push(window.setTimeout(function (): void { setStatus(T_RESULT, String(last)); }, span + 20));
    }
    if (reduce) setStatus(T_RESULT, String(Number(dieEl.getAttribute('data-face')) || 2));
    btn.addEventListener('click', onRoll);
    cleaners.push(function (): void { btn.removeEventListener('click', onRoll); });
    function destroy(): void {
      clearTimers();
      for (var i = 0; i < cleaners.length; i += 1) cleaners[i]();
    }


    return destroy;
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.bp} is-demo`} ref={rootRef}>
        <div className={styles.fd} aria-hidden="true">
          <div className={styles.fd__floor} ref={floorRef} />
          <div className={styles.fd__shadow} ref={shadowRef} />
          <div className={styles.fd__hop} ref={hopRef}>
            <div className={styles.fd__squeeze} ref={squeezeRef}>
              <div className={styles.fd__die} ref={dieRef} data-face="2">
              <div className={`${styles.fd__face} ${styles["fd__face--1"]}`}><i className={`${styles.pip} ${styles.r2} ${styles.c2}`} /></div>
              <div className={`${styles.fd__face} ${styles["fd__face--2"]}`}><i className={`${styles.pip} ${styles.r1} ${styles.c1}`} /><i className={`${styles.pip} ${styles.r3} ${styles.c3}`} /></div>
              <div className={`${styles.fd__face} ${styles["fd__face--3"]}`}><i className={`${styles.pip} ${styles.r1} ${styles.c1}`} /><i className={`${styles.pip} ${styles.r2} ${styles.c2}`} /><i className={`${styles.pip} ${styles.r3} ${styles.c3}`} /></div>
              <div className={`${styles.fd__face} ${styles["fd__face--4"]}`}><i className={`${styles.pip} ${styles.r1} ${styles.c1}`} /><i className={`${styles.pip} ${styles.r1} ${styles.c3}`} /><i className={`${styles.pip} ${styles.r3} ${styles.c1}`} /><i className={`${styles.pip} ${styles.r3} ${styles.c3}`} /></div>
              <div className={`${styles.fd__face} ${styles["fd__face--5"]}`}><i className={`${styles.pip} ${styles.r1} ${styles.c1}`} /><i className={`${styles.pip} ${styles.r1} ${styles.c3}`} /><i className={`${styles.pip} ${styles.r2} ${styles.c2}`} /><i className={`${styles.pip} ${styles.r3} ${styles.c1}`} /><i className={`${styles.pip} ${styles.r3} ${styles.c3}`} /></div>
              <div className={`${styles.fd__face} ${styles["fd__face--6"]}`}><i className={`${styles.pip} ${styles.r1} ${styles.c1}`} /><i className={`${styles.pip} ${styles.r2} ${styles.c1}`} /><i className={`${styles.pip} ${styles.r3} ${styles.c1}`} /><i className={`${styles.pip} ${styles.r1} ${styles.c3}`} /><i className={`${styles.pip} ${styles.r2} ${styles.c3}`} /><i className={`${styles.pip} ${styles.r3} ${styles.c3}`} /></div>
              </div>
            </div>
          </div>
        </div>
        <output className={styles.bp__status} aria-live="polite"><span ref={labelRef}>굴리는 중</span> <b ref={numRef} /></output>
        <button type="button" className={styles.bp__btn} ref={btnRef}>굴리기</button>
        <p className={styles.bp__caption}>3D 계산 없이 면 한 장의 가로 폭을 줄였다 늘리며 눈 수를 바꿔 끼우고 바닥 줄무늬를 한 칸씩 밀어, 평면 주사위가 굴러가는 모습을 키프레임 스타일 규칙으로 만든다.</p>
      </div>
    </main>
  );
}
