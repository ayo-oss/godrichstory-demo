// GazeDodgeEye — vanilla 판(run/301/demo/04-gaze-dodge-eye) 의 React 포트.
// 눈은 pointermove 로 옮겨진 표적을 rAF 보간(lerp)으로 쫓고 움직임은 전부 translate3d 다.
// 게임 상태는 60fps 루프 안에서만 바뀌므로 useRef 하나에 묶고, 화면 전환(미리보기·벌점·패배)만 state 로 렌더한다.
// duration·easing·accentColor 는 props → CSS 변수로 들어온다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GazeDodgeEye.module.scss";

export type GazeDodgeEyeProps = {
  duration?: string;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type PointerEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T };
type GameState = {
  running: boolean; dead: boolean; startT: number; lastNow: number;
  penalty: number; dangerAcc: number; best: number; near: boolean;
  eye: { x: number; y: number }; target: { x: number; y: number };
};

const BEST_KEY = "p301-04-best";
const TIME_FMT = "{s}초";
const CAUGHT_LINE = "버틴 시간 {s}초";
const WARN_TEXT = "눈이 가깝다";
const HINT_TEXT = "마우스를 움직여 눈을 피하세요 · 방향키로도 표적을 움직일 수 있어요 · 벌점이 3개가 되면 끝입니다";
const AGAIN_LABEL = "다시 시작";
const TITLE_TEXT = "시선 피하기";
const SURVIVED_LABEL = "버틴 시간";
const PENALTY_LABEL = "벌점";
const CAUGHT_TITLE = "눈에게 잡혔다";

// 눈 추적 보간 계수 — 프레임당 0.055. reduce 에서는 1로 올려 즉시 따라오게 한다
const LERP = 0.055;
const DANGER_DIST = 60;
const DANGER_MS = 450;
const KEY_STEP = 26;

function fmtTime(sec: number): string {
  return TIME_FMT.replace("{s}", sec.toFixed(1));
}

export default function GazeDodgeEye({ duration, easing, accentColor }: GazeDodgeEyeProps) {
  const [isDemo, setIsDemo] = useState(true);
  const [pen, setPen] = useState(0);
  const [overOpen, setOverOpen] = useState(false);
  const [overLine, setOverLine] = useState(CAUGHT_LINE.replace("{s}", "0.0"));
  const [bestText, setBestText] = useState(fmtTime(0));
  const [near, setNear] = useState(false);

  const arenaRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const eyeRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const targetRef = useRef<HTMLDivElement | null>(null) as Box<HTMLDivElement | null>;
  const scoreRef = useRef<HTMLSpanElement | null>(null) as Box<HTMLSpanElement | null>;
  // rAF 루프 안에서 isDemo state 를 읽기 위한 거울과, 바깥 재시작 버튼이 부를 초기화 구멍
  const isDemoRef = useRef(true) as Box<boolean>;
  const api = useRef<{ reset(): void }>({ reset() { /* effect 가 들어오기 전의 호출은 무시한다 */ } }) as Box<{ reset(): void }>;

  const g = useRef({
    running: false, dead: false, startT: 0, lastNow: 0,
    penalty: 0, dangerAcc: 0, best: 0, near: false,
    eye: { x: 0, y: 0 }, target: { x: 0, y: 0 },
  }) as Box<GameState>;

  useEffect(() => { isDemoRef.current = isDemo; }, [isDemo]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lerp = reduce ? 1 : LERP;
    const st = g.current;
    try { st.best = Number(window.localStorage.getItem(BEST_KEY)) || 0; } catch (e) { st.best = 0; }
    setBestText(fmtTime(st.best));

    const arena = arenaRef.current;
    const eyeWrap = eyeRef.current;
    const targetWrap = targetRef.current;
    if (!arena || !eyeWrap || !targetWrap) { return; }

    const arenaRect = () => arena.getBoundingClientRect();
    const placeTarget = (x: number, y: number) => {
      const r = arenaRect();
      st.target.x = Math.max(8, Math.min(r.width - 8, x));
      st.target.y = Math.max(8, Math.min(r.height - 8, y));
    };
    const centerOf = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      const a = arenaRect();
      return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2 };
    };
    // 눈과 표적은 translate3d 로만 움직인다 — left/top 을 바꾸면 매 프레임 배치가 다시 계산된다
    const paint = () => {
      eyeWrap.style.transform =
        "translate3d(" + (st.eye.x - eyeWrap.offsetWidth / 2) + "px," + (st.eye.y - eyeWrap.offsetHeight / 2) + "px,0)";
      targetWrap.style.transform =
        "translate3d(" + (st.target.x - targetWrap.offsetWidth / 2) + "px," + (st.target.y - targetWrap.offsetHeight / 2) + "px,0)";
    };
    const saveBest = (sec: number) => {
      if (sec <= st.best) { return; }
      st.best = sec;
      try { window.localStorage.setItem(BEST_KEY, String(st.best)); } catch (e) { /* 저장이 막힌 창에서는 넘어간다 */ }
      setBestText(fmtTime(st.best));
    };
    const endGame = () => {
      st.running = false;
      st.dead = true;
      const sec = (performance.now() - st.startT) / 1000;
      if (scoreRef.current) { scoreRef.current.textContent = fmtTime(sec); }
      setOverLine(CAUGHT_LINE.replace("{s}", sec.toFixed(1)));
      setOverOpen(true);
      saveBest(sec);
    };
    const addPenalty = () => {
      st.penalty += 1;
      setPen(st.penalty);
      if (st.penalty >= 3) { endGame(); }
    };
    const begin = () => {
      if (st.running || st.dead) { return; }
      setIsDemo(false);
      // 미리보기 키프레임이 그려 놓은 자리에서 시작한다 — 중앙으로 튀지 않게 현재 위치를 읽어 온다
      st.eye = centerOf(eyeWrap);
      st.penalty = 0;
      st.dangerAcc = 0;
      setPen(0);
      setOverOpen(false);
      st.running = true;
      st.startT = performance.now();
      st.lastNow = st.startT;
    };
    const resetGame = () => {
      st.running = false;
      st.dead = false;
      st.penalty = 0;
      st.dangerAcc = 0;
      setPen(0);
      setOverOpen(false);
      if (scoreRef.current) { scoreRef.current.textContent = fmtTime(0); }
      const r = arenaRect();
      st.eye = { x: r.width / 2, y: r.height / 2 };
      placeTarget(r.width * 0.74, r.height * 0.5);
      paint();
    };
    api.current.reset = resetGame;

    let raf = 0;
    const tick = (now: number) => {
      const dt = now - st.lastNow;
      st.lastNow = now;
      if (!isDemoRef.current) {
        st.eye.x += (st.target.x - st.eye.x) * lerp;
        st.eye.y += (st.target.y - st.eye.y) * lerp;
        paint();
        const isNear = Math.hypot(st.target.x - st.eye.x, st.target.y - st.eye.y) < DANGER_DIST;
        if (isNear !== st.near) { st.near = isNear; setNear(isNear); }
        if (st.running) {
          const sec = (now - st.startT) / 1000;
          if (scoreRef.current) { scoreRef.current.textContent = fmtTime(sec); }
          if (isNear) {
            st.dangerAcc += dt;
            if (st.dangerAcc >= DANGER_MS) { st.dangerAcc = 0; addPenalty(); }
          } else {
            st.dangerAcc = Math.max(0, st.dangerAcc - dt * 2);
          }
        }
      }
      raf = window.requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvt) => {
      const r = arenaRect();
      placeTarget(e.clientX - r.left, e.clientY - r.top);
      begin();
    };
    const onKey = (e: KeyEvt) => {
      let dx = 0, dy = 0;
      if (e.key === "ArrowLeft") { dx = -KEY_STEP; }
      else if (e.key === "ArrowRight") { dx = KEY_STEP; }
      else if (e.key === "ArrowUp") { dy = -KEY_STEP; }
      else if (e.key === "ArrowDown") { dy = KEY_STEP; }
      else { return; }
      e.preventDefault();
      begin();
      placeTarget(st.target.x + dx, st.target.y + dy);
    };

    resetGame();
    raf = window.requestAnimationFrame(tick);
    arena.addEventListener("pointermove", onMove);
    window.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(raf);
      arena.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const vars: Vars = {};
  if (duration) { vars["--duration"] = duration; }
  if (easing) { vars["--easing"] = easing; }
  if (accentColor) { vars["--color"] = accentColor; }

  const rootCls = [styles.root, isDemo ? styles.isDemo : "", near ? styles.isNear : ""].filter(Boolean).join(" ");

  return (
    <div className={rootCls} style={vars}>
      <header className={styles.bar}>
        <p className={styles.title}>
          <svg className={styles.ico} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M128 56c-80 0-112 72-112 72s32 72 112 72s112-72 112-72s-32-72-112-72m0 112a40 40 0 1 1 40-40a40 40 0 0 1-40 40" opacity=".2" />
            <path d="M247.31 124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57 61.26 162.88 48 128 48S61.43 61.26 36.34 86.35C17.51 105.18 9 124 8.69 124.76a8 8 0 0 0 0 6.5c.35.79 8.82 19.57 27.65 38.4C61.43 194.74 93.12 208 128 208s66.57-13.26 91.66-38.34c18.83-18.83 27.3-37.61 27.65-38.4a8 8 0 0 0 0-6.5M128 192c-30.78 0-57.67-11.19-79.93-33.25A133.5 133.5 0 0 1 25 128a133.3 133.3 0 0 1 23.07-30.75C70.33 75.19 97.22 64 128 64s57.67 11.19 79.93 33.25A133.5 133.5 0 0 1 231.05 128c-7.21 13.46-38.62 64-103.05 64m0-112a48 48 0 1 0 48 48a48.05 48.05 0 0 0-48-48m0 80a32 32 0 1 1 32-32a32 32 0 0 1-32 32" />
          </svg>
          <span>{TITLE_TEXT}</span>
        </p>
        <p className={styles.pill}>
          <span className={styles.label}>{SURVIVED_LABEL}</span>
          <b className={styles.num} ref={scoreRef}>{fmtTime(0)}</b>
        </p>
        <p className={styles.pill}>
          <svg className={styles.icoSm} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M200 48v63.1c0 39.7-31.75 72.6-71.45 72.9A72 72 0 0 1 56 112V48Z" opacity=".2" />
            <path d="M232 64h-24V48a8 8 0 0 0-8-8H56a8 8 0 0 0-8 8v16H24A16 16 0 0 0 8 80v16a40 40 0 0 0 40 40h3.65A80.13 80.13 0 0 0 120 191.61V216H96a8 8 0 0 0 0 16h64a8 8 0 0 0 0-16h-24v-24.42c31.94-3.23 58.44-25.64 68.08-55.58H208a40 40 0 0 0 40-40V80a16 16 0 0 0-16-16M48 120a24 24 0 0 1-24-24V80h24v32q0 4 .39 8Zm144-8.9c0 35.52-29 64.64-64 64.9a64 64 0 0 1-64-64V56h128ZM232 96a24 24 0 0 1-24 24h-.5a82 82 0 0 0 .5-8.9V80h24Z" />
          </svg>
          <b className={styles.num}>{bestText}</b>
        </p>
        <button
          className={styles.btn}
          type="button"
          aria-label={AGAIN_LABEL}
          onClick={() => { setIsDemo(false); api.current.reset(); }}
        >
          <svg className={styles.icoSm} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2" />
            <path d="M240 56v48a8 8 0 0 1-8 8h-48a8 8 0 0 1 0-16h27.4l-26.59-24.36l-.25-.24a80 80 0 1 0-1.67 114.78a8 8 0 0 1 11 11.63A95.44 95.44 0 0 1 128 224h-1.32a96 96 0 1 1 69.07-164L224 85.8V56a8 8 0 1 1 16 0" />
          </svg>
        </button>
      </header>

      <div className={styles.arena} ref={arenaRef}>
        <p className={styles.dotsWrap}>
          <span className={styles.dotsLabel}>{PENALTY_LABEL}</span>
          <span className={styles.dots}>
            <i className={pen > 0 ? styles.dotHit : styles.dot} />
            <i className={pen > 1 ? styles.dotHit : styles.dot} />
            <i className={pen > 2 ? styles.dotHit : styles.dot} />
          </span>
        </p>
        <p className={styles.warn}>{WARN_TEXT}</p>

        <div className={styles.eyeWrap} ref={eyeRef}>
          <span className={styles.ring} aria-hidden="true" />
          <svg className={styles.eye} viewBox="0 0 120 120" aria-hidden="true">
            <ellipse className={styles.ball} cx="60" cy="60" rx="54" ry="36" />
            <circle className={styles.iris} cx="60" cy="60" r="21" />
            <circle className={styles.pupil} cx="60" cy="60" r="10" />
            <circle className={styles.glint} cx="67" cy="53" r="5" />
          </svg>
        </div>

        <div className={styles.targetWrap} ref={targetRef}>
          <span className={styles.halo} aria-hidden="true" />
          <svg className={styles.cursor} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M213.66 201L201 213.66a8 8 0 0 1-11.31 0l-51.31-51.31a8 8 0 0 0-13 2.46l-17.82 46.41a8 8 0 0 1-14.85-.71L40.41 50.44a8 8 0 0 1 10-10l160.1 52.24a8 8 0 0 1 .71 14.85l-46.41 17.82a8 8 0 0 0-2.46 13l51.31 51.31a8 8 0 0 1 0 11.34" opacity=".2" />
            <path d="M168 132.69L214.08 115l.33-.13a16 16 0 0 0-1.41-29.8L52.92 32.8A15.95 15.95 0 0 0 32.8 52.92L85.07 213a15.82 15.82 0 0 0 14.41 11h.78a15.84 15.84 0 0 0 14.61-9.59l.13-.33L132.69 168L184 219.31a16 16 0 0 0 22.63 0l12.68-12.68a16 16 0 0 0 0-22.63ZM195.31 208L144 156.69a16 16 0 0 0-26 4.93c0 .11-.09.22-.13.32l-17.65 46L48 48l159.85 52.2l-45.95 17.64l-.32.13a16 16 0 0 0-4.93 26L208 195.31Z" />
          </svg>
        </div>

        <div className={styles.over} hidden={!overOpen}>
          <div className={styles.overPanel}>
            <p className={styles.overTitle}>{CAUGHT_TITLE}</p>
            <p className={styles.overLine}>{overLine}</p>
            <button
              className={styles.again}
              type="button"
              onClick={() => { api.current.reset(); }}
            >
              <svg className={styles.icoSm} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
                <path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2" />
                <path d="M240 56v48a8 8 0 0 1-8 8h-48a8 8 0 0 1 0-16h27.4l-26.59-24.36l-.25-.24a80 80 0 1 0-1.67 114.78a8 8 0 0 1 11 11.63A95.44 95.44 0 0 1 128 224h-1.32a96 96 0 1 1 69.07-164L224 85.8V56a8 8 0 1 1 16 0" />
              </svg>
              <span>{AGAIN_LABEL}</span>
            </button>
          </div>
        </div>
      </div>

      <p className={styles.hint}>{HINT_TEXT}</p>
    </div>
  );
}
