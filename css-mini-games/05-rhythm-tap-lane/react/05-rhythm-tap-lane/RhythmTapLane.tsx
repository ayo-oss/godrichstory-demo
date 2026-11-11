// RhythmTapLane — vanilla 판(run/301/demo/05-rhythm-tap-lane) 의 React 포트.
// 노트는 CSS 애니메이션(translateY)으로 낙하하고, 키를 누른 순간 그 노트 애니메이션의 시계를
// getAnimations 로 읽어 판정한다. 명중한 노트는 animation-play-state: paused 로 제자리에 멈춘다.
// 노트 목록은 렌더 대상이라 state 로, 프레임마다 바뀌는 게임 시계는 ref 로 나눠 들었다.
// duration·easing·accentColor 는 props → CSS 변수로 들어온다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RhythmTapLane.module.scss";

export type RhythmTapLaneProps = {
  duration?: string;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; repeat: boolean };
type Box<T> = { current: T };
type Verdict = "perfect" | "good" | "miss";
type Note = { id: number; lane: number; due: number; judged: Verdict | null; due2: boolean };
type Phase = "demo" | "ready" | "play" | "done";

const BEST_KEY = "p301-05-best";
const VERDICT_PERFECT = "퍼펙트";
const VERDICT_GOOD = "좋음";
const VERDICT_MISS = "놓침";
const COMBO_FMT = "{n} 콤보";
const RESULT_FMT = "점수 {s} · 최대 콤보 {c} · 놓침 {m}";
const TITLE_TEXT = "리듬 탭";
const BOARD_LABEL = "리듬 탭 놀이판";
const SCORE_LABEL = "점수";
const MISS_LABEL = "놓침";
const AGAIN_LABEL = "다시 시작";
const DONE_TITLE = "곡 끝!";
const START_TITLE = "J K L 키로 노트를 받아요";
const START_SUB = "1 2 3 으로도 받을 수 있어요 · 판정선에 노트가 닿는 순간이 퍼펙트입니다";
const HINT_TEXT = "퍼펙트 100점 · 좋음 60점 · 콤보가 이어지면 보너스가 붙어요";

// 곡 스케줄 — [박수, 레인]. 박 하나는 480ms, 첫 노트는 5박(2400ms) 뒤에 판정선에 닿는다
const BEAT = 480;
const SONG: number[][] = [[5, 0], [6, 1], [7, 2], [9, 1], [10, 0], [12, 2], [13, 1], [14, 0], [16, 2],
  [17, 1], [18, 2], [20, 0], [21, 1], [22, 2], [24, 1], [25, 0], [27, 2], [28, 1]];
// 판정 창(ms) — 노트 애니메이션의 시계와 도착 시점(duration)의 차이로 갈린다
const WIN_PERFECT = 115, WIN_GOOD = 240, WIN_MISS = 400;
const KEY_LANE: { [k: string]: number } = { j: 0, k: 1, l: 2, "1": 0, "2": 1, "3": 2 };
const LANE_KEYS = ["J", "K", "L"];
// 미리보기 노트 — 레인마다 2개, 지연을 흩뿌려 둔다
const PREVIEW: number[][] = [[0, 0], [0, -1000], [1, -333], [1, -1333], [2, -666], [2, -1666]];

function verdictText(v: Verdict): string {
  return v === "perfect" ? VERDICT_PERFECT : (v === "good" ? VERDICT_GOOD : VERDICT_MISS);
}

export default function RhythmTapLane({ duration, easing, accentColor }: RhythmTapLaneProps) {
  const [phase, setPhase] = useState<Phase>("demo");
  const [notes, setNotes] = useState<Note[]>([]);
  const [score, setScore] = useState(0);
  const [miss, setMiss] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [verdict, setVerdict] = useState<{ v: Verdict; n: number } | null>(null);
  const [demoVerdict, setDemoVerdict] = useState<{ v: Verdict; combo: number }>({ v: "perfect", combo: 4 });

  const wellRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]) as Box<(HTMLDivElement | null)[]>;
  const g = useRef({ t0: 0, fallMs: 2000, raf: 0, seq: 0, phase: "demo" as Phase, reduce: false }) as
    Box<{ t0: number; fallMs: number; raf: number; seq: number; phase: Phase; reduce: boolean }>;
  const notesRef = useRef<Note[]>([]) as Box<Note[]>;
  const api = useRef<{ start(): void; ready(): void }>({ start() { /* 마운트 전 호출은 무시한다 */ }, ready() { /* 같다 */ } }) as
    Box<{ start(): void; ready(): void }>;

  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { g.current.phase = phase; }, [phase]);

  useEffect(() => {
    const st = g.current;
    st.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try { setBest(Number(window.localStorage.getItem(BEST_KEY)) || 0); } catch (e) { setBest(0); }
  }, []);

  // 노트 DOM 의 낙하 애니메이션 — getAnimations 로 직접 잡는다 (애니메이션 시계가 곧 판정 기준이다)
  const fallAnim = (el: Element): Animation | null => {
    const list = el.getAnimations();
    for (let i = 0; i < list.length; i++) {
      const a = list[i] as Animation & { animationName?: string };
      if (a.animationName === "rtlFall") { return a; }
    }
    return list[0] || null;
  };
  const wallNow = (n: Note): number => (performance.now() - g.current.t0) - n.due + g.current.fallMs;
  // 판정에 쓰는 시각 — 낙하가 끝난 애니메이션은 currentTime 이 끝점에 고정되므로 그때부터 벽시계로 넘어간다
  const noteNow = (n: Note): number => {
    if (g.current.reduce) { return wallNow(n); }
    const el = document.getElementById("rtl-note-" + n.id);
    if (!el) { return wallNow(n); }
    const a = fallAnim(el);
    if (a && a.effect && a.playState !== "finished") {
      const ct = a.effect.getComputedTiming();
      const delay = (a.effect.getTiming().delay as number) || 0;
      if (ct.localTime != null) { return (ct.localTime as number) - delay; }
    }
    return wallNow(n);
  };

  const judge = (id: number, v: Verdict) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, judged: v } : n)));
    if (v === "miss") {
      setCombo(0);
      setMiss((m) => m + 1);
    } else {
      setCombo((c) => {
        const next = c + 1;
        setMaxCombo((mx) => (next > mx ? next : mx));
        setScore((s) => s + (v === "perfect" ? 100 : 60) + next * 5);
        return next;
      });
    }
    g.current.seq += 1;
    setVerdict({ v, n: g.current.seq });
    window.setTimeout(() => { setNotes((prev) => prev.filter((n) => n.id !== id)); }, 320);
  };

  const pressLane = (lane: number) => {
    if (g.current.phase !== "play") {
      if (g.current.phase === "demo" || g.current.phase === "ready") { api.current.start(); }
      return;
    }
    let target: Note | null = null;
    let bestDiff = Infinity;
    for (const n of notesRef.current) {
      if (n.judged || n.lane !== lane) { continue; }
      const diff = Math.abs(noteNow(n) - g.current.fallMs);
      if (diff < bestDiff) { bestDiff = diff; target = n; }
    }
    if (!target || bestDiff > WIN_MISS) { return; }
    judge(target.id, bestDiff <= WIN_PERFECT ? "perfect" : (bestDiff <= WIN_GOOD ? "good" : "miss"));
  };

  useEffect(() => {
    const onKey = (e: KeyEvt) => {
      if (e.repeat) { return; }
      const lane = KEY_LANE[e.key.toLowerCase()];
      if (lane === undefined) { return; }
      pressLane(lane);
    };
    const handler = onKey as unknown as (e: Event) => void;
    window.addEventListener("keydown", handler);
    return () => { window.removeEventListener("keydown", handler); };
  }, []);

  // 곡 시작 — 낙하 시간을 먼저 재고 스케줄을 animation-delay 로 심는다
  const start = () => {
    const st = g.current;
    setPhase("play");
    st.phase = "play";
    setScore(0); setMiss(0); setCombo(0); setMaxCombo(0); setVerdict(null);
    const list: Note[] = SONG.map((row, i) => ({ id: i + 1, lane: row[1], due: row[0] * BEAT, judged: null, due2: false }));
    setNotes(list);
    notesRef.current = list;
    st.t0 = performance.now();
    // duration 은 CSS 가 정한다 — 첫 노트가 붙은 뒤 한 프레임 안에 읽어 스케줄 계산에 쓴다
    window.requestAnimationFrame(() => {
      const el = document.getElementById("rtl-note-1");
      const a = el ? fallAnim(el) : null;
      const d = a && a.effect ? (a.effect.getTiming().duration as number) : 2000;
      st.fallMs = typeof d === "number" && d > 0 ? d : 2000;
    });
  };
  const ready = () => {
    setPhase("ready");
    g.current.phase = "ready";
    setNotes([]); notesRef.current = [];
    setScore(0); setMiss(0); setCombo(0); setMaxCombo(0); setVerdict(null);
  };
  api.current.start = start;
  api.current.ready = ready;

  // 놓친 노트를 치우고 곡이 끝났는지 본다
  useEffect(() => {
    if (phase !== "play") { return; }
    const st = g.current;
    let raf = 0;
    const tick = () => {
      let remain = 0;
      for (const n of notesRef.current) {
        if (n.judged) { continue; }
        remain += 1;
        const cur = noteNow(n);
        if (st.reduce && !n.due2 && Math.abs(cur - st.fallMs) <= WIN_MISS) {
          setNotes((prev) => prev.map((x) => (x.id === n.id ? { ...x, due2: true } : x)));
        }
        if (cur > st.fallMs + WIN_MISS) { judge(n.id, "miss"); remain -= 1; }
      }
      const lastDue = SONG[SONG.length - 1][0] * BEAT;
      if (remain === 0 && performance.now() - st.t0 > lastDue + 900) {
        setPhase("done");
        st.phase = "done";
        return;
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => { window.cancelAnimationFrame(raf); };
  }, [phase]);

  // 최고 점수는 곡이 끝난 순간에만 갱신한다
  useEffect(() => {
    if (phase !== "done" || score <= best) { return; }
    setBest(score);
    try { window.localStorage.setItem(BEST_KEY, String(score)); } catch (e) { /* 저장이 막힌 창에서는 넘어간다 */ }
  }, [phase]);

  // 미리보기 — 판정 글자와 콤보가 도는 연출만 담당한다 (채점은 미리보기를 뗀 뒤에만)
  useEffect(() => {
    if (phase !== "demo") { return; }
    const kinds: Verdict[] = ["perfect", "good", "perfect", "miss"];
    const combos = [4, 9, 16, 7];
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setDemoVerdict({ v: kinds[i % 4], combo: combos[i % 4] });
    }, 700);
    return () => { window.clearInterval(id); };
  }, [phase]);

  const vars: Vars = {};
  if (duration) { vars["--duration"] = duration; }
  if (easing) { vars["--easing"] = easing; }
  if (accentColor) { vars["--color"] = accentColor; }

  const isDemo = phase === "demo";
  const shownVerdict: Verdict | null = isDemo ? demoVerdict.v : (verdict ? verdict.v : null);
  const vCls = shownVerdict === "perfect" ? styles.vPerfect : (shownVerdict === "good" ? styles.vGood : styles.vMiss);
  const comboShown = isDemo ? demoVerdict.combo : combo;

  return (
    <div className={[styles.root, isDemo ? styles.isDemo : ""].filter(Boolean).join(" ")} style={vars}>
      <header className={styles.bar}>
        <p className={styles.title}>
          <svg className={styles.ico} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M208 164a28 28 0 1 1-28-28a28 28 0 0 1 28 28m-156 4a28 28 0 1 0 28 28a28 28 0 0 0-28-28" opacity=".2" />
            <path d="M212.92 17.69a8 8 0 0 0-6.86-1.45l-128 32A8 8 0 0 0 72 56v110.08A36 36 0 1 0 88 196v-85.75l112-28v51.83A36 36 0 1 0 216 164V24a8 8 0 0 0-3.08-6.31M52 216a20 20 0 1 1 20-20a20 20 0 0 1-20 20M88 93.75v-31.5l112-28v31.5ZM180 184a20 20 0 1 1 20-20a20 20 0 0 1-20 20" />
          </svg>
          <span>{TITLE_TEXT}</span>
        </p>
        <p className={styles.pill}><span className={styles.label}>{SCORE_LABEL}</span><b className={styles.num}>{score}</b></p>
        <p className={styles.pill}><span className={styles.label}>{MISS_LABEL}</span><b className={styles.num}>{miss}</b></p>
        <p className={styles.pill}>
          <svg className={styles.icoSm} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M200 48v63.1c0 39.7-31.75 72.6-71.45 72.9A72 72 0 0 1 56 112V48Z" opacity=".2" />
            <path d="M232 64h-24V48a8 8 0 0 0-8-8H56a8 8 0 0 0-8 8v16H24A16 16 0 0 0 8 80v16a40 40 0 0 0 40 40h3.65A80.13 80.13 0 0 0 120 191.61V216H96a8 8 0 0 0 0 16h64a8 8 0 0 0 0-16h-24v-24.42c31.94-3.23 58.44-25.64 68.08-55.58H208a40 40 0 0 0 40-40V80a16 16 0 0 0-16-16M48 120a24 24 0 0 1-24-24V80h24v32q0 4 .39 8Zm144-8.9c0 35.52-29 64.64-64 64.9a64 64 0 0 1-64-64V56h128ZM232 96a24 24 0 0 1-24 24h-.5a82 82 0 0 0 .5-8.9V80h24Z" />
          </svg>
          <b className={styles.num}>{best}</b>
        </p>
        <button className={styles.btn} type="button" aria-label={AGAIN_LABEL} onClick={ready}>
          <svg className={styles.icoSm} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2" />
            <path d="M240 56v48a8 8 0 0 1-8 8h-48a8 8 0 0 1 0-16h27.4l-26.59-24.36l-.25-.24a80 80 0 1 0-1.67 114.78a8 8 0 0 1 11 11.63A95.44 95.44 0 0 1 128 224h-1.32a96 96 0 1 1 69.07-164L224 85.8V56a8 8 0 1 1 16 0" />
          </svg>
        </button>
      </header>

      <div className={styles.board} aria-label={BOARD_LABEL} onClick={() => { if (phase === "ready") { start(); } }}>
        {[0, 1, 2].map((lane) => (
          <div className={styles.lane} key={lane} style={{ "--k": lane } as CSSProperties}>
            <div className={styles.well} ref={(el: HTMLDivElement | null) => { wellRefs.current[lane] = el; }}>
              {isDemo && PREVIEW.filter((row) => row[0] === lane).map((row, i) => (
                <span className={styles.pv} key={i} style={{ "--d": row[1] + "ms" } as CSSProperties} />
              ))}
              {notes.filter((n) => n.lane === lane).map((n) => (
                <span
                  key={n.id}
                  id={"rtl-note-" + n.id}
                  className={[styles.note,
                    n.judged === "miss" ? styles.noteMiss : "",
                    n.judged && n.judged !== "miss" ? styles.noteHit : "",
                    n.due2 ? styles.noteDue : ""].filter(Boolean).join(" ")}
                  style={{ animationDelay: (n.due - g.current.fallMs) + "ms" }}
                />
              ))}
            </div>
            <span className={styles.key}>{LANE_KEYS[lane]}</span>
          </div>
        ))}

        <span className={styles.line} aria-hidden="true" />
        <p className={[styles.combo, isDemo ? styles.comboBump : ""].filter(Boolean).join(" ")} hidden={comboShown < 2}>
          {COMBO_FMT.replace("{n}", String(comboShown))}
        </p>
        <p
          className={[styles.verdict, vCls, shownVerdict ? styles.vShow : ""].filter(Boolean).join(" ")}
          key={isDemo ? "demo-" + demoVerdict.combo : "hit-" + (verdict ? verdict.n : 0)}
          aria-live="polite"
        >
          {shownVerdict ? verdictText(shownVerdict) : ""}
        </p>

        <div className={styles.cover} hidden={phase !== "ready"}>
          <p className={styles.coverTitle}>{START_TITLE}</p>
          <p className={styles.coverSub}>{START_SUB}</p>
        </div>

        <div className={styles.cover} hidden={phase !== "done"}>
          <p className={styles.coverTitle}>{DONE_TITLE}</p>
          <p className={styles.resultLine}>
            {RESULT_FMT.replace("{s}", String(score)).replace("{c}", String(maxCombo)).replace("{m}", String(miss))}
          </p>
          <button className={styles.again} type="button" onClick={start}>
            <svg className={styles.icoSm} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2" />
              <path d="M240 56v48a8 8 0 0 1-8 8h-48a8 8 0 0 1 0-16h27.4l-26.59-24.36l-.25-.24a80 80 0 1 0-1.67 114.78a8 8 0 0 1 11 11.63A95.44 95.44 0 0 1 128 224h-1.32a96 96 0 1 1 69.07-164L224 85.8V56a8 8 0 1 1 16 0" />
            </svg>
            <span>{AGAIN_LABEL}</span>
          </button>
        </div>
      </div>

      <p className={styles.hint}>{HINT_TEXT}</p>
    </div>
  );
}
