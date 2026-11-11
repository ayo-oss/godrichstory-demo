// EmojiPickerReducedMotionInstantPanel — vanilla 판(run/402/demo/09-.../index.html) 의 React 포트.
// 계산 겹: matchMedia(prefers-reduced-motion).matches 값과 데모용 강제 값을 합쳐 지속시간(ms)
// 숫자를 계산해 패널에 인라인으로 놓는다 — 미디어쿼리 블록의 존재 여부가 아니라 그 값 자체를 쓴다.
import { useEffect, useRef, useState } from "react";
import styles from "./EmojiPickerReducedMotionInstantPanel.module.scss";

type Box<T> = { current: T };

const REDUCE_MOTION_DURATION_MS = 0;
const NORMAL_MOTION_DURATION_MS = 240;
const ROWS = ["배경 무늬", "알림음", "글자 크기"];

export default function EmojiPickerReducedMotionInstantPanel() {
  const [isDemo, setIsDemo] = useState(true);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [reduceOn, setReduceOn] = useState(false);
  const [live, setLive] = useState("");
  const [durationMs, setDurationMs] = useState(NORMAL_MOTION_DURATION_MS);

  const isDemoRef = useRef(true) as unknown as Box<boolean>;
  const synthRef = useRef(false) as unknown as Box<boolean>;
  const openRef = useRef(false) as unknown as Box<boolean>;
  const forcedReduceRef = useRef(false) as unknown as Box<boolean>;
  const hideTimerRef = useRef(0) as unknown as Box<number>;
  const loopTimerRef = useRef(0) as unknown as Box<number>;

  function human() {
    if (synthRef.current) return;
    if (isDemoRef.current) { isDemoRef.current = false; setIsDemo(false); }
  }

  function applyMotionPref(): { reduce: boolean; ms: number } {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = mq.matches || forcedReduceRef.current;
    const ms = reduce ? REDUCE_MOTION_DURATION_MS : NORMAL_MOTION_DURATION_MS;
    setDurationMs(ms);
    setReduceOn(reduce);
    return { reduce: reduce, ms: ms };
  }

  function openPanel() {
    const pref = applyMotionPref();
    setHidden(false);
    window.setTimeout(() => setOpen(true), 0);
    setLive(pref.ms + "ms 값으로 " + (pref.reduce ? "즉시 표시" : "펼쳐짐"));
  }

  function closePanel() {
    setOpen(false);
    const pref = applyMotionPref();
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setHidden(true), pref.ms + 20);
  }

  function toggle() {
    human();
    if (!openRef.current) { openRef.current = true; openPanel(); }
    else { openRef.current = false; closePanel(); }
  }

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    function onChange() { forcedReduceRef.current = false; applyMotionPref(); }
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", onChange);

    const reduce = mq.matches;
    let phase = 0;
    function runStep() {
      if (!isDemoRef.current) return;
      synthRef.current = true;
      if (phase % 4 === 0) { forcedReduceRef.current = false; applyMotionPref(); }
      else if (phase % 4 === 2) { forcedReduceRef.current = true; applyMotionPref(); }
      toggle();
      synthRef.current = false;
      phase++;
      loopTimerRef.current = window.setTimeout(runStep, 350);
    }
    if (!reduce) { loopTimerRef.current = window.setTimeout(runStep, 420); }
    else { isDemoRef.current = false; setIsDemo(false); }
    return () => {
      window.clearTimeout(loopTimerRef.current);
      window.clearTimeout(hideTimerRef.current);
      if (typeof mq.removeEventListener === "function") mq.removeEventListener("change", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panelStyle = { transitionDuration: durationMs + "ms" } as any;

  return (
    <main className={styles.stage}>
      <div className={styles.rp + " " + (isDemo ? styles.isDemo : "")}>
        <button
          className={styles.trigger}
          type="button"
          aria-haspopup="true"
          aria-expanded={open}
          onClick={toggle}
        >
          설정
        </button>
        <div
          className={styles.panel + " " + (open ? styles.panelOpen : "")}
          role="menu"
          hidden={hidden}
          style={panelStyle}
        >
          {ROWS.map((r, i) => (
            <div key={i} className={styles.row} role="menuitem">{r}</div>
          ))}
        </div>
        <p className={styles.badge}>{"동작 줄임 " + (reduceOn ? "켜짐" : "꺼짐")}</p>
        <p className={styles.sr} role="status" aria-live="polite">{live}</p>
      </div>
    </main>
  );
}
