// ReactionTimeSignal — vanilla 판(run/301/demo/09-reaction-time-signal/index.html) 의 React 포트.
// 대기(무작위 1.5~4초) → 신호(크림 면, transition) → 결과(ms) 상태 머신. 재는 건 performance.now().
// 상태 전환은 상태 클래스(isIdle/isArmed/isSignal/isResult/isPenalty) 갈아 끼우기로 화면에 반영한다.
import { useEffect, useRef, useState } from "react";
import styles from "./ReactionTimeSignal.module.scss";

export type ReactionTimeSignalProps = {
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Grade = { max: number; cls: string; label: string };
type Vars = { [k: string]: string | undefined };
// ambient.d.ts 의 useRef 는 { current: T | null } 을 돌려주므로 값 보관용 참조는 null 없는 상자로 단언한다
type Box<T> = { current: T };

const BEST_KEY = "p301-09-best";
const MS_TEXT = "{n}ms";
const IDLE_TITLE = "클릭하면 시작합니다";
const IDLE_SUB = "신호가 켜진 뒤 최대한 빨리 누르세요";
const ARM_TITLE = "신호를 기다리세요";
const ARM_SUB = "켜지면 바로 누르세요";
const GO_TITLE = "지금 누르세요!";
const PEN_TITLE = "너무 성급해요!";
const PEN_SUB = "신호가 켜진 뒤에 누르세요";
const LABEL_BEST = "최고기록";
const LABEL_LAST = "직전 기록";
const NO_RECORD = "—";
const RESTART = "다시 시작";
const HINT = "클릭 · 스페이스로 반응합니다";
const FIELD_ARIA = "반응속도 놀이판. 신호가 켜지면 클릭이나 스페이스로 최대한 빨리 누릅니다";
// 평가 라벨 4단계
const GRADES: Grade[] = [
  { max: 200, cls: "s1", label: "매우 빠름" },
  { max: 260, cls: "s2", label: "빠름" },
  { max: 350, cls: "s3", label: "보통" },
  { max: Infinity, cls: "s4", label: "느림" }
];
const GRADE_CLS: { [k: string]: string } = {
  s1: "gradeS1", s2: "gradeS2", s3: "gradeS3", s4: "gradeS4"
};

const WAIT_MIN = 1500; // 대기 최소 ms
const WAIT_RANGE = 2500; // 대기 폭 ms (1.5~4초)

type Phase = "idle" | "armed" | "signal" | "result" | "penalty";

function loadBest(): number | null {
  try {
    const v = Number(window.localStorage.getItem(BEST_KEY));
    return v > 0 ? v : null; // 최고기록은 최소 ms — 0 이하는 기록이 아니다
  } catch (e) { return null; }
}

export default function ReactionTimeSignal({
  duration = 2000,
  easing = "ease-out",
  accentColor = "#fff7e6",
}: ReactionTimeSignalProps) {
  const st = useRef({ state: "idle" as Phase, best: null as number | null, last: null as number | null, signalAt: 0 }) as Box<{
    state: Phase; best: number | null; last: number | null; signalAt: number;
  }>;
  const armTimer = useRef(0) as Box<number>;
  const restartRef = useRef<HTMLButtonElement | null>(null);      // 결과 얼굴의 버튼
  const penRestartRef = useRef<HTMLButtonElement | null>(null);   // 벌점 얼굴의 버튼

  const [phase, setPhase] = useState<Phase>("idle");
  const [best, setBest] = useState<number | null>(null);
  const [last, setLast] = useState<number | null>(null);
  const [demo, setDemo] = useState(true);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--accent": accentColor };

  function saveBest() {
    try { window.localStorage.setItem(BEST_KEY, String(st.current.best)); } catch (e) { /* 시크릿 창에서는 저장만 건너뛴다 */ }
  }
  function go(next: Phase) {
    st.current.state = next;
    setPhase(next);
  }
  function arm() {
    setDemo(false); // 격자 미리보기 연출을 떼고 실제 게임으로
    window.clearTimeout(armTimer.current);
    go("armed");
    armTimer.current = window.setTimeout(() => {
      st.current.signalAt = performance.now();
      go("signal");
    }, WAIT_MIN + Math.random() * WAIT_RANGE);
  }
  function settle() {
    const ms = Math.round(performance.now() - st.current.signalAt);
    st.current.last = ms;
    setLast(ms);
    if (st.current.best === null || ms < st.current.best) {
      st.current.best = ms;
      setBest(ms);
      saveBest();
    }
    go("result");
  }
  function act() {
    if (st.current.state === "armed") {
      window.clearTimeout(armTimer.current); // 판 초기화 — 걸려 있던 대기 타이머를 끈다
      go("penalty");
      return;
    }
    if (st.current.state === "signal") { settle(); return; }
    arm(); // idle · result · penalty 에서는 다음 판 시작
  }
  function restart() {
    window.clearTimeout(armTimer.current); // 판 초기화 — 걸려 있던 대기 타이머를 끄고 처음 화면으로
    go("idle");
  }

  // 최초 배치 + 키보드 + 언마운트 정리
  useEffect(() => {
    st.current.best = loadBest();
    setBest(st.current.best);
    const down = (e: KeyboardEvent) => {
      if (e.repeat) { return; } // 키 자동 반복으로 대기가 계속 새로 시작되지 않게 한다
      if (e.key !== " " && e.code !== "Space") { return; }
      const ae = document.activeElement;
      if (ae === restartRef.current || ae === penRestartRef.current) { return; } // 버튼 포커스 중에는 기본 클릭에 맡긴다
      e.preventDefault();
      act();
    };
    window.addEventListener("keydown", down);
    return () => {
      window.removeEventListener("keydown", down);
      window.clearTimeout(armTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stateCls: { [k in Phase]: string } = {
    idle: styles.isIdle, armed: styles.isArmed, signal: styles.isSignal, result: styles.isResult, penalty: styles.isPenalty
  };
  const rootCls = [styles.root, demo ? styles.isDemo : "", stateCls[phase]].filter(Boolean).join(" ");
  const grade = last === null ? GRADES[2] : GRADES.find(g => last <= g.max) || GRADES[GRADES.length - 1];
  const gradeCls = [styles.grade, styles[GRADE_CLS[grade.cls]]].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-lightning" viewBox="0 0 256 256" fill="currentColor"><g><path d="m96 240l16-80l-64-24L160 16l-16 80l64 24Z" opacity=".2"/><path d="M215.79 118.17a8 8 0 0 0-5-5.66L153.18 90.9l14.66-73.33a8 8 0 0 0-13.69-7l-112 120a8 8 0 0 0 3 13l57.63 21.61l-14.62 73.25a8 8 0 0 0 13.69 7l112-120a8 8 0 0 0 1.94-7.26M109.37 214l10.47-52.38a8 8 0 0 0-5-9.06L62 132.71l84.62-90.66l-10.46 52.38a8 8 0 0 0 5 9.06l52.8 19.8Z"/></g></symbol>
          <symbol id="ico-clock" viewBox="0 0 256 256" fill="currentColor"><g><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2"/><path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88m64-88a8 8 0 0 1-8 8h-56a8 8 0 0 1-8-8V72a8 8 0 0 1 16 0v48h48a8 8 0 0 1 8 8"/></g></symbol>
          <symbol id="ico-trophy" viewBox="0 0 256 256" fill="currentColor"><g><path d="M200 48v63.1c0 39.7-31.75 72.6-71.45 72.9A72 72 0 0 1 56 112V48Z" opacity=".2"/><path d="M232 64h-24V48a8 8 0 0 0-8-8H56a8 8 0 0 0-8 8v16H24A16 16 0 0 0 8 80v16a40 40 0 0 0 40 40h3.65A80.13 80.13 0 0 0 120 191.61V216H96a8 8 0 0 0 0 16h64a8 8 0 0 0 0-16h-24v-24.42c31.94-3.23 58.44-25.64 68.08-55.58H208a40 40 0 0 0 40-40V80a16 16 0 0 0-16-16M48 120a24 24 0 0 1-24-24V80h24v32q0 4 .39 8Zm144-8.9c0 35.52-29 64.64-64 64.9a64 64 0 0 1-64-64V56h128ZM232 96a24 24 0 0 1-24 24h-.5a82 82 0 0 0 .5-8.9V80h24Z"/></g></symbol>
          <symbol id="ico-warning" viewBox="0 0 256 256" fill="currentColor"><g><path d="M215.46 216H40.54c-12.62 0-20.54-13.21-14.41-23.91l87.46-151.87c6.3-11 22.52-11 28.82 0l87.46 151.87c6.13 10.7-1.79 23.91-14.41 23.91" opacity=".2"/><path d="M236.8 188.09L149.35 36.22a24.76 24.76 0 0 0-42.7 0L19.2 188.09a23.51 23.51 0 0 0 0 23.72A24.35 24.35 0 0 0 40.55 224h174.9a24.35 24.35 0 0 0 21.33-12.19a23.51 23.51 0 0 0 .02-23.72m-13.87 15.71a8.5 8.5 0 0 1-7.48 4.2H40.55a8.5 8.5 0 0 1-7.48-4.2a7.59 7.59 0 0 1 0-7.72l87.45-151.87a8.75 8.75 0 0 1 15 0l87.45 151.87a7.59 7.59 0 0 1-.04 7.72M120 144v-40a8 8 0 0 1 16 0v40a8 8 0 0 1-16 0m20 36a12 12 0 1 1-12-12a12 12 0 0 1 12 12"/></g></symbol>
          <symbol id="ico-restart" viewBox="0 0 256 256" fill="currentColor"><g><path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2"/><path d="M240 56v48a8 8 0 0 1-8 8h-48a8 8 0 0 1 0-16h27.4l-26.59-24.36l-.25-.24a80 80 0 1 0-1.67 114.78a8 8 0 0 1 11 11.63A95.44 95.44 0 0 1 128 224h-1.32a96 96 0 1 1 69.07-164L224 85.8V56a8 8 0 1 1 16 0"/></g></symbol>
        </defs>
      </svg>
      <div className={rootCls} style={vars}>
        <header className={styles.hud}>
          <p className={styles.stat}>
            <svg className={styles.ico} aria-hidden="true"><use href="#ico-trophy" /></svg>
            <span className={styles.label}>{LABEL_BEST}</span>
            <b className={styles.num} aria-live="polite">{best === null ? NO_RECORD : `${best}ms`}</b>
          </p>
          <p className={styles.stat}>
            <svg className={styles.ico} aria-hidden="true"><use href="#ico-clock" /></svg>
            <span className={styles.label}>{LABEL_LAST}</span>
            <b className={styles.num}>{last === null ? NO_RECORD : `${last}ms`}</b>
          </p>
        </header>
        <div
          className={styles.panel}
          tabIndex={0}
          role="application"
          aria-label={FIELD_ARIA}
          onPointerDown={() => act()}
        >
          <p className={[styles.face, styles.faceWait].join(" ")}>
            <span className={styles.waitTitle}>{phase === "idle" ? IDLE_TITLE : ARM_TITLE}</span>
            <span className={styles.waitSub}>{phase === "idle" ? IDLE_SUB : ARM_SUB}</span>
          </p>
          <p className={[styles.face, styles.faceGo].join(" ")}>
            <svg className={styles.goIco} aria-hidden="true"><use href="#ico-lightning" /></svg>
            <span className={styles.goTitle}>{GO_TITLE}</span>
          </p>
          <p className={[styles.face, styles.faceResult].join(" ")}>
            <b className={styles.ms}>{MS_TEXT.replace("{n}", String(last === null ? 0 : last))}</b>
            <span className={gradeCls}>{grade.label}</span>
            <button className={styles.restart} ref={restartRef} type="button" onClick={restart}>
              <svg className={styles.ico} aria-hidden="true"><use href="#ico-restart" /></svg>
              <span>{RESTART}</span>
            </button>
          </p>
          <p className={[styles.face, styles.facePenalty].join(" ")}>
            <svg className={styles.penIco} aria-hidden="true"><use href="#ico-warning" /></svg>
            <span className={styles.penTitle}>{PEN_TITLE}</span>
            <span className={styles.penSub}>{PEN_SUB}</span>
            <button className={styles.restart} ref={penRestartRef} type="button" onClick={restart}>
              <svg className={styles.ico} aria-hidden="true"><use href="#ico-restart" /></svg>
              <span>{RESTART}</span>
            </button>
          </p>
          <p className={styles.demoMs} aria-hidden="true" />
        </div>
        <p className={styles.hint}>{HINT}</p>
      </div>
    </main>
  );
}
