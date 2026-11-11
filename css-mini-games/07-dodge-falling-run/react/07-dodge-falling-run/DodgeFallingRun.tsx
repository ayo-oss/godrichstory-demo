// DodgeFallingRun — vanilla 판(run/301/demo/07-dodge-falling-run/index.html) 의 React 포트.
// 장애물 낙하는 CSS animation(translateY), 로켓 이동은 requestAnimationFrame 의 translateX,
// 충돌은 getBoundingClientRect 겹침 검사. 값·규칙은 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./DodgeFallingRun.module.scss";

export type DodgeFallingRunProps = {
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Rock = { id: number; leftPct: number; size: number; fallMs: number };
type Vars = { [k: string]: string | undefined };
// ambient.d.ts 의 useRef 는 { current: T | null } 을 돌려주므로 값 보관용 참조는 null 없는 상자로 단언한다
type Box<T> = { current: T };

const BEST_KEY = "p301-07-best";
const OVER_SCORE_TEXT = "{n}개 피했습니다";
const LIVES_ARIA = "남은 목숨 {n}";
const HINT = "방향키 또는 A 와 D 로 움직여 장애물을 피하세요";
const FIELD_ARIA = "떨어지는 장애물 피하기 놀이판";
const LABEL_SCORE = "점수";
const LABEL_BEST = "최고기록";
const OVER_TITLE = "게임 끝";
const RESTART = "다시 시작";
const PLAYER_SPEED = 250; // 초당 픽셀
const START_LIVES = 3;

function loadBest(): number {
  try { return Number(window.localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; }
}
function saveBest(n: number) {
  try { window.localStorage.setItem(BEST_KEY, String(n)); } catch (e) { /* 시크릿 창에서는 저장만 건너뛴다 */ }
}

export default function DodgeFallingRun({
  duration = 2000,
  easing = "ease-out",
  accentColor = "#17141a",
}: DodgeFallingRunProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<HTMLSpanElement | null>(null);
  const restartRef = useRef<HTMLButtonElement | null>(null);
  const keys = useRef({ left: false, right: false }) as Box<{ left: boolean; right: boolean }>;
  const pointerX = useRef(null) as Box<number | null>;
  const px = useRef(0) as Box<number>;
  const invulnUntil = useRef(0) as Box<number>;
  const rockId = useRef(0) as Box<number>;
  const g = useRef({ score: 0, best: 0, lives: START_LIVES, running: false, over: false }) as Box<{
    score: number; best: number; lives: number; running: boolean; over: boolean;
  }>;

  const [rocks, setRocks] = useState<Rock[]>([]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [demo, setDemo] = useState(true);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--accent": accentColor };
  const demoVars = (x0: string, y0: string, d0: string): Vars => ({ "--x0": x0, "--y0": y0, "--d0": d0 });

  function place() {
    const field = fieldRef.current, player = playerRef.current;
    if (!field || !player) { return; }
    const w = field.clientWidth - player.offsetWidth;
    px.current = Math.max(0, Math.min(w, px.current));
    player.style.transform = "translateX(" + Math.round(px.current) + "px)";
  }
  function setPointerFrom(e: ReactPointerEvent<HTMLDivElement>) {
    const field = fieldRef.current, player = playerRef.current;
    if (!field || !player) { return; }
    const r = field.getBoundingClientRect();
    const w = field.clientWidth - player.offsetWidth;
    pointerX.current = Math.max(0, Math.min(w, e.clientX - r.left - player.offsetWidth / 2));
  }
  function removeRock(id: number) {
    setRocks(rs => rs.filter(r => r.id !== id));
  }
  function dodge(id: number) {
    removeRock(id);
    if (!g.current.running) { return; }
    g.current.score += 1;
    setScore(g.current.score);
    if (g.current.score > g.current.best) {
      g.current.best = g.current.score;
      setBest(g.current.best);
      saveBest(g.current.best);
    }
  }
  function damage(now: number) {
    g.current.lives -= 1;
    setLives(g.current.lives);
    invulnUntil.current = now + 900;
    const player = playerRef.current;
    if (player) {
      player.classList.remove("is-hit");
      void player.offsetWidth; // 피격 깜빡임 애니메이션을 처음부터 다시 트는 재정렬 트릭
      player.classList.add("is-hit");
    }
    if (g.current.lives <= 0) { endGame(); }
  }
  function endGame() {
    g.current.running = false;
    g.current.over = true;
    setRunning(false);
    setRocks([]);
    saveBest(g.current.best);
    setOver(true);
  }
  function startRun() {
    if (g.current.running) { return; }
    g.current.running = true;
    g.current.over = false;
    setDemo(false);
    setOver(false);
    setRunning(true);
    const field = fieldRef.current;
    if (field) { field.focus({ preventScroll: true }); }
  }
  function restart() {
    g.current.score = 0;
    g.current.lives = START_LIVES;
    setScore(0);
    setLives(START_LIVES);
    const field = fieldRef.current;
    if (field) { px.current = Math.max(0, (field.clientWidth - 36) / 2); }
    place();
    startRun();
  }

  // 최초 배치 + 키보드·리사이즈
  useEffect(() => {
    g.current.best = loadBest();
    setBest(g.current.best);
    const field = fieldRef.current, player = playerRef.current;
    if (field && player) {
      px.current = Math.max(0, (field.clientWidth - player.offsetWidth) / 2);
      place();
      player.style.setProperty("--cx", Math.round(px.current) + "px");
    }
    const down = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") { keys.current.left = true; e.preventDefault(); }
      else if (k === "ArrowRight" || k === "d" || k === "D") { keys.current.right = true; e.preventDefault(); }
      else { return; }
      if (!g.current.running && !g.current.over) { startRun(); }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") { keys.current.left = false; }
      else if (k === "ArrowRight" || k === "d" || k === "D") { keys.current.right = false; }
    };
    const onResize = () => place();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 장애물 스폰 (점수가 오를수록 촘촘하게)
  useEffect(() => {
    if (!running) { return; }
    let alive = true;
    let t = 0;
    const spawn = () => {
      if (!alive) { return; }
      const id = rockId.current + 1;
      rockId.current = id;
      const size = 20 + Math.floor(Math.random() * 11);
      const fallMs = Math.max(820, 1500 - g.current.score * 14);
      setRocks(rs => [...rs, { id, leftPct: 4 + Math.random() * 84, size, fallMs }]);
      t = window.setTimeout(spawn, Math.max(320, 720 - g.current.score * 9));
    };
    t = window.setTimeout(spawn, 350);
    return () => { alive = false; window.clearTimeout(t); };
  }, [running]);

  // 이동 + 충돌 검사 루프
  useEffect(() => {
    if (!running) { return; }
    let raf = 0;
    let last = performance.now();
    const overlap = (a: DOMRect, b: DOMRect) =>
      a.left < b.right - 2 && a.right > b.left + 2 && a.top < b.bottom - 4 && a.bottom > b.top + 4;
    const tick = (now: number) => {
      const dt = Math.min(64, now - last) / 1000;
      last = now;
      const field = fieldRef.current, player = playerRef.current;
      if (!field || !player) { return; }
      const dir = (keys.current.right ? 1 : 0) - (keys.current.left ? 1 : 0);
      if (dir !== 0) {
        pointerX.current = null;
        px.current += dir * PLAYER_SPEED * dt;
      } else if (pointerX.current !== null) {
        const d = pointerX.current - px.current;
        const step = PLAYER_SPEED * dt;
        px.current += Math.abs(d) <= step ? d : Math.sign(d) * step;
      }
      place();
      if (now >= invulnUntil.current) {
        const pr = player.getBoundingClientRect();
        const hit = new DOMRect(pr.left + 5, pr.top + 6, pr.width - 10, pr.height - 10);
        const els = field.querySelectorAll("[data-rock]");
        for (let i = 0; i < els.length; i++) {
          const el = els[i];
          if (overlap(hit, el.getBoundingClientRect())) {
            const id = Number(el.getAttribute("data-rock"));
            removeRock(id);
            damage(now);
            break;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // 게임 끝 오버레이가 열리면 다시 시작 버튼으로 포커스를 옮긴다
  useEffect(() => {
    if (over && restartRef.current) { restartRef.current.focus({ preventScroll: true }); }
  }, [over]);

  function onFieldPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!g.current.running && !g.current.over) { startRun(); setPointerFrom(e); }
  }
  function onFieldPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (g.current.running) { setPointerFrom(e); }
  }

  const rootCls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const rockVars = (r: Rock): Vars => ({ "--t": `${r.fallMs}ms` });
  const hearts = [0, 1, 2];

  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-game" viewBox="0 0 256 256" fill="currentColor"><g><path d="M216.86 207.57a28 28 0 0 1-24.66-7.77L150.09 152H172a51.94 51.94 0 0 0 51.2-61l16.36 84.17a28 28 0 0 1-22.7 32.4" opacity=".2"/><path d="M176 112h-24a8 8 0 0 1 0-16h24a8 8 0 0 1 0 16m-72-16h-8v-8a8 8 0 0 0-16 0v8h-8a8 8 0 0 0 0 16h8v8a8 8 0 0 0 16 0v-8h8a8 8 0 0 0 0-16m137.48 104.65a36 36 0 0 1-54.94 4.81c-.12-.12-.24-.24-.35-.37L146.48 160h-37l-39.67 45.09l-.35.37A36.08 36.08 0 0 1 44 216a36 36 0 0 1-35.44-42.25a.7.7 0 0 1 0-.14l16.37-84.09A59.88 59.88 0 0 1 83.89 40H172a60.08 60.08 0 0 1 59 49.25v.18l16.37 84.17a.7.7 0 0 1 0 .14a35.74 35.74 0 0 1-5.89 26.91M172 144a44 44 0 0 0 0-88H83.89a43.9 43.9 0 0 0-43.21 36.37v.13L24.3 176.59A20 20 0 0 0 58 194.3l41.92-47.59a8 8 0 0 1 6-2.71Zm59.7 32.59l-8.74-45A60 60 0 0 1 172 160h-4.2l30.2 34.31a20.09 20.09 0 0 0 17.46 5.39a20 20 0 0 0 16.23-23.11Z"/></g></symbol>
          <symbol id="ico-trophy" viewBox="0 0 256 256" fill="currentColor"><g><path d="M200 48v63.1c0 39.7-31.75 72.6-71.45 72.9A72 72 0 0 1 56 112V48Z" opacity=".2"/><path d="M232 64h-24V48a8 8 0 0 0-8-8H56a8 8 0 0 0-8 8v16H24A16 16 0 0 0 8 80v16a40 40 0 0 0 40 40h3.65A80.13 80.13 0 0 0 120 191.61V216H96a8 8 0 0 0 0 16h64a8 8 0 0 0 0-16h-24v-24.42c31.94-3.23 58.44-25.64 68.08-55.58H208a40 40 0 0 0 40-40V80a16 16 0 0 0-16-16M48 120a24 24 0 0 1-24-24V80h24v32q0 4 .39 8Zm144-8.9c0 35.52-29 64.64-64 64.9a64 64 0 0 1-64-64V56h128ZM232 96a24 24 0 0 1-24 24h-.5a82 82 0 0 0 .5-8.9V80h24Z"/></g></symbol>
          <symbol id="ico-restart" viewBox="0 0 256 256" fill="currentColor"><g><path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2"/><path d="M240 56v48a8 8 0 0 1-8 8h-48a8 8 0 0 1 0-16h27.4l-26.59-24.36l-.25-.24a80 80 0 1 0-1.67 114.78a8 8 0 0 1 11 11.63A95.44 95.44 0 0 1 128 224h-1.32a96 96 0 1 1 69.07-164L224 85.8V56a8 8 0 1 1 16 0"/></g></symbol>
          <symbol id="ico-heart" viewBox="0 0 256 256" fill="currentColor"><g><path d="M232 102c0 66-104 122-104 122S24 168 24 102a54 54 0 0 1 54-54c22.59 0 41.94 12.31 50 32c8.06-19.69 27.41-32 50-32a54 54 0 0 1 54 54" opacity=".2"/><path d="M178 40c-20.65 0-38.73 8.88-50 23.89C116.73 48.88 98.65 40 78 40a62.07 62.07 0 0 0-62 62c0 70 103.79 126.66 108.21 129a8 8 0 0 0 7.58 0C136.21 228.66 240 172 240 102a62.07 62.07 0 0 0-62-62m-50 174.8c-18.26-10.64-96-59.11-96-112.8a46.06 46.06 0 0 1 46-46c19.45 0 35.78 10.36 42.6 27a8 8 0 0 0 14.8 0c6.82-16.67 23.15-27 42.6-27a46.06 46.06 0 0 1 46 46c0 53.61-77.76 102.15-96 112.8"/></g></symbol>
          <symbol id="ico-rocket" viewBox="0 0 256 256" fill="currentColor"><g><path d="m94.81 192l-29.45 22.24a8 8 0 0 1-12.81-4.51L40.19 154.1a8 8 0 0 1 1.66-6.86l30.31-36.33C71 134.25 76.7 161.43 94.81 192m119.34-44.76l-30.31-36.33c1.21 23.34-4.54 50.52-22.65 81.09l29.45 22.24a8 8 0 0 0 12.81-4.51l12.36-55.63a8 8 0 0 0-1.66-6.86" opacity=".2"/><path d="M152 224a8 8 0 0 1-8 8h-32a8 8 0 0 1 0-16h32a8 8 0 0 1 8 8m-24-112a12 12 0 1 0-12-12a12 12 0 0 0 12 12m95.62 43.83l-12.36 55.63a16 16 0 0 1-25.51 9.11L158.51 200h-61l-27.26 20.57a16 16 0 0 1-25.51-9.11l-12.36-55.63a16.09 16.09 0 0 1 3.32-13.71l28.56-34.26a123 123 0 0 1 8.57-36.67c12.9-32.34 36-52.63 45.37-59.85a16 16 0 0 1 19.6 0c9.34 7.22 32.47 27.51 45.37 59.85a123 123 0 0 1 8.57 36.67l28.56 34.26a16.09 16.09 0 0 1 3.32 13.71M99.43 184h57.14c21.12-37.54 25.07-73.48 11.74-106.88C156.55 47.64 134.49 29 128 24c-6.51 5-28.57 23.64-40.33 53.12c-13.31 33.4-9.36 69.34 11.76 106.88m-15 5.85q-16.15-29.35-19.6-57.69L48 152.36L60.36 208l.18-.13ZM208 152.36l-16.83-20.2q-3.42 28.28-19.56 57.69l23.85 18l.18.13Z"/></g></symbol>
        </defs>
      </svg>
      <div className={rootCls} style={vars}>
        <header className={styles.hud}>
          <p className={styles.stat}>
            <svg className={styles.ico} aria-hidden="true"><use href="#ico-game" /></svg>
            <span className={styles.label}>{LABEL_SCORE}</span>
            <b className={styles.num} aria-live="polite">{score}</b>
          </p>
          <p className={styles.livesBox} aria-label={LIVES_ARIA.replace("{n}", String(lives))}>
            {hearts.map(i => (
              <i key={i} className={[styles.life, i < lives ? styles.lifeOn : ""].filter(Boolean).join(" ")}>
                <svg aria-hidden="true"><use href="#ico-heart" /></svg>
              </i>
            ))}
          </p>
          <p className={styles.stat}>
            <svg className={styles.ico} aria-hidden="true"><use href="#ico-trophy" /></svg>
            <span className={styles.label}>{LABEL_BEST}</span>
            <b className={styles.num}>{best}</b>
          </p>
        </header>
        <div
          className={styles.field}
          ref={fieldRef}
          tabIndex={0}
          role="application"
          aria-label={FIELD_ARIA}
          onPointerDown={onFieldPointerDown}
          onPointerMove={onFieldPointerMove}
        >
          {demo && (
            <>
              <i className={styles.rockDemo} style={demoVars("16%", "22%", "0ms")} />
              <i className={styles.rockDemo} style={demoVars("40%", "34%", "-500ms")} />
              <i className={styles.rockDemo} style={demoVars("62%", "58%", "-1000ms")} />
              <i className={styles.rockDemo} style={demoVars("84%", "70%", "-1500ms")} />
            </>
          )}
          {rocks.map(r => (
            <i
              key={r.id}
              className={styles.rock}
              data-rock={r.id}
              style={{ left: `${r.leftPct}%`, width: r.size, height: r.size, ...rockVars(r) }}
              onAnimationEnd={() => dodge(r.id)}
            />
          ))}
          <span className={styles.player} ref={playerRef}>
            <svg className={styles.rocket} aria-hidden="true"><use href="#ico-rocket" /></svg>
          </span>
          {!running && !over && <p className={styles.hint}>{HINT}</p>}
          {over && (
            <div className={styles.over}>
              <div className={styles.overPanel}>
                <p className={styles.overTitle}>{OVER_TITLE}</p>
                <p className={styles.overScore}>{OVER_SCORE_TEXT.replace("{n}", String(score))}</p>
                <button className={styles.restart} ref={restartRef} type="button" onClick={restart}>
                  <svg className={styles.ico} aria-hidden="true"><use href="#ico-restart" /></svg>
                  <span>{RESTART}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
