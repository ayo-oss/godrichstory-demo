import { useEffect, useRef } from 'react';
import styles from './XfKeyboardNudge.module.scss';

const KEYBOARD_NUDGE_PX = 1; // 변형 08 이 8 로 키운다 — 키 하나를 눌렀을 때의 기본 이동량
const ACCEL_WINDOW_MS = 450;
const MAX_MULT = 6;
const SIM_TICK_MS = 50;
const DIRS: Record<string, { dx: number; dy: number }> = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 }
};
const SEQUENCE = [
  { dir: DIRS.ArrowRight, holdTicks: 8 },
  { dir: DIRS.ArrowDown, holdTicks: 6 },
  { dir: DIRS.ArrowLeft, holdTicks: 8 },
  { dir: DIRS.ArrowUp, holdTicks: 6 }
];

export default function XfKeyboardNudge() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene0 = sceneRef.current;
    if (!scene0) return undefined;
    const scene = scene0;
    const draggable0 = scene.querySelector<HTMLDivElement>('.' + styles.draggable);
    const rm0 = scene.querySelector<HTMLSpanElement>('#rm');
    if (!draggable0 || !rm0) return undefined;
    const draggable = draggable0;
    const rm = rm0;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const frameW = 184, frameH = 108;
    let tx = 70, ty = 38;
    let holdStart = 0;
    let holdKey: string | null = null;
    let timers: number[] = [];

    function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

    // 눌린 시간(elapsed) → 가속 배수. 막 눌렀을 때는 1배, ACCEL_WINDOW_MS 마다 1배씩 커져
    // MAX_MULT 에서 멈춘다 — 키를 오래 누를수록(브라우저 네이티브 키 반복이 이 함수를 계속 호출) 더 멀리 간다.
    function computeStep(elapsedMs: number) {
      const mult = 1 + Math.min(Math.floor(elapsedMs / ACCEL_WINDOW_MS), MAX_MULT - 1);
      return { step: Math.max(1, Math.round(KEYBOARD_NUDGE_PX * mult)), mult };
    }

    function moveBy(dx: number, dy: number, mult: number) {
      tx = clamp(tx + dx, 0, frameW - 44);
      ty = clamp(ty + dy, 0, frameH - 32);
      draggable.style.transform = 'matrix(1,0,0,1,' + tx.toFixed(0) + ',' + ty.toFixed(0) + ')';
      rm.textContent = String(mult);
    }

    function human() {
      if (scene.classList.contains(styles['is-demo'])) {
        scene.classList.remove(styles['is-demo']);
        timers.forEach((t) => window.clearTimeout(t));
        timers = [];
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      const dir = DIRS[e.key];
      if (!dir) return;
      human();
      e.preventDefault();
      if (!e.repeat || holdKey !== e.key) {
        holdKey = e.key;
        holdStart = performance.now();
      }
      const elapsed = performance.now() - holdStart;
      const acc = computeStep(elapsed);
      moveBy(dir.dx * acc.step, dir.dy * acc.step, acc.mult);
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === holdKey) { holdKey = null; rm.textContent = '1'; }
    }

    draggable.addEventListener('keydown', onKeyDown);
    draggable.addEventListener('keyup', onKeyUp);

    draggable.style.transform = 'matrix(1,0,0,1,' + tx + ',' + ty + ')';

    // reduce: 실사용 경로 적용 — 위 keydown/keyup 은 트윈 없이 매 이벤트마다 즉시 반영한다.
    // 아래 자동 루프는 시연 게이트만 — 실제 키 대신 같은 computeStep() 을 내부 타이머로 흉내내며
    // reduce 에서는 돌지 않는다.
    let seqI = 0;

    function simulateHold(entry: { dir: { dx: number; dy: number }; holdTicks: number }, onDone: () => void) {
      let tick = 0;
      function step() {
        if (!scene.classList.contains(styles['is-demo'])) return;
        const elapsed = tick * SIM_TICK_MS;
        const acc = computeStep(elapsed);
        moveBy(entry.dir.dx * acc.step, entry.dir.dy * acc.step, acc.mult);
        tick++;
        if (tick < entry.holdTicks) {
          timers.push(window.setTimeout(step, SIM_TICK_MS));
        } else {
          rm.textContent = '1';
          onDone();
        }
      }
      step();
    }

    function loop() {
      if (!scene.classList.contains(styles['is-demo'])) return;
      const entry = SEQUENCE[seqI % SEQUENCE.length];
      seqI++;
      simulateHold(entry, () => {
        timers.push(window.setTimeout(loop, 400));
      });
    }

    if (!reduce) {
      timers.push(window.setTimeout(loop, 500));
    }

    return () => {
      draggable.removeEventListener('keydown', onKeyDown);
      draggable.removeEventListener('keyup', onKeyUp);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.scene + ' ' + styles['is-demo']} ref={sceneRef}>
        <div className={styles.frame}>
          <div
            className={styles.draggable}
            tabIndex={0}
            aria-label="화살표 키로 이동, 오래 누르면 가속"
          ></div>
        </div>
        <div className={styles.readout} aria-hidden="true">×<span id="rm">1</span></div>
      </div>
    </main>
  );
}
