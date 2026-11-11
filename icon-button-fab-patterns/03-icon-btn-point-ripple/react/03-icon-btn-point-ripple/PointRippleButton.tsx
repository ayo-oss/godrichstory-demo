import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./PointRippleButton.module.scss";

export type PointRippleButtonProps = {
  buttonLabel?: string;
  hintIdle?: string;
  hintDone?: string;
  groupLabel?: string;
  /** 오른쪽 위 안 읽은 표시 */
  unread?: boolean;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type WaveVars = CSSProperties & { "--x": string; "--y": string };
// ambient 가 얇아 KeyboardEvent 를 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type KeyEvt = { key: string };
type Wave = { id: number; x: number; y: number };

export default function PointRippleButton({
  buttonLabel = "Open notifications",
  hintIdle = "Press anywhere on the button",
  hintDone = "Notifications opened",
  groupLabel = "Icon button that ripples from the pressed point",
  unread = true,
  demo = true,
  duration = 300,
  easing = "ease-out",
  color = "#fff7e6",
}: PointRippleButtonProps) {
  const [waves, setWaves] = useState<Wave[]>([]);
  const [live, setLive] = useState(demo);
  const [hint, setHint] = useState(hintIdle);
  const seq = useRef<number>(0);
  const timers = useRef<number[]>([]);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const life = duration * 2;      // 리플 한 번의 수명 — scss 의 calc(var(--duration) * 2) 와 같다

  useEffect(() => () => {
    const list = timers.current;
    if (!list) return;
    for (const t of list) window.clearTimeout(t);
  }, []);

  // 눌린 지점을 --x · --y 로 옮겨 적는다. 원은 transform · opacity 로만 커진다
  function onPointerDown(e: PointerEvent<HTMLButtonElement>) {
    setLive(false);
    const box = e.currentTarget.getBoundingClientRect();
    const id = (seq.current === null ? 0 : seq.current) + 1;   // useRef 는 T|null 이라 null 가드
    seq.current = id;
    setWaves((prev) => prev.concat([{ id, x: e.clientX - box.left, y: e.clientY - box.top }]));
    setHint(hintDone);
    const t = window.setTimeout(() => {
      setWaves((prev) => prev.filter((w) => w.id !== id));
    }, life + 20);
    const list = timers.current;
    if (list) list.push(t);
  }

  function onKeyDown(e: KeyEvt) {
    if (e.key !== "Enter" && e.key !== " ") return;
    setLive(false);
    setHint(hintDone);
  }

  const cls = [styles.rp, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <button
        className={styles.btn}
        type="button"
        aria-label={buttonLabel}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
      >
        <span className={styles.seed} aria-hidden="true" />
        <span className={[styles.seed, styles.seedB].join(" ")} aria-hidden="true" />
        <span className={styles.ic} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor"><path d="M208,192H48a8,8,0,0,1-6.88-12C47.71,168.6,56,139.81,56,104a72,72,0,0,1,144,0c0,35.82,8.3,64.6,14.9,76A8,8,0,0,1,208,192Z" opacity=".2"/><path d="M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z"/></svg>
        </span>
        {unread && <span className={styles.dot} aria-hidden="true" />}
        {waves.map((w) => {
          const wv: WaveVars = { "--x": `${w.x}px`, "--y": `${w.y}px` };
          return <span className={styles.wave} style={wv} key={w.id} aria-hidden="true" />;
        })}
      </button>
      <p className={styles.hint}>{hint}</p>
    </section>
  );
}
