// ShareCard — vanilla 판(run/297/demo/09-habit-share-card/index.html) 의 React 포트.
// 카드는 DOM 이 아니라 canvas 에 그린다. 값·수치·그리는 좌표는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ShareCard.module.scss";

export type ShareCardProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type State = { streak: number; done: number; total: number };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

const STORE = "godrich-habit-card";
const TITLE = "오늘 요약 카드";
const CANVAS_LABEL = "오늘 요약 카드 이미지";
const HEAD_TEXT = "오늘의 습관 요약";
const STREAK_TEXT = "{n}일 연속";
const DONE_TEXT = "완료 {c}/{t}";
const COPY_TEXT = "이미지로 복사";
const MORE_TEXT = "하루 더 채우기";
const COPIED_TEXT = "복사했습니다";
const SAVED_TEXT = "이미지로 내려받았습니다";
const MADE_TEXT = "카드를 만들었습니다";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function ShareCard({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<number>(0) as Box<number>;
  const [state, setState] = useState<State>({ streak: 12, done: 5, total: 6 });
  const [say, setSay] = useState(MADE_TEXT);
  const [toast, setToast] = useState("");
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE);
      if (raw) { setState(JSON.parse(raw) as State); }
    } catch (e) { /* 저장소가 막힌 창에서는 기본값 그대로 */ }
    return () => { window.clearTimeout(timerRef.current); };
  }, []);

  // 카드는 상태가 바뀔 때마다 다시 그린다 — 버튼을 누르기 전에도 무엇을 공유하는지 보여야 한다
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) { return; }
    const ctx = canvas.getContext("2d");
    if (!ctx) { return; }
    const d = new Date();
    ctx.clearRect(0, 0, 400, 224);
    ctx.fillStyle = "#17141a";
    roundRect(ctx, 0, 0, 400, 224, 24);
    ctx.fill();
    ctx.fillStyle = "#ffd23f";
    roundRect(ctx, 24, 24, 8, 40, 4);
    ctx.fill();
    ctx.fillStyle = "#fff7e6";
    ctx.textBaseline = "top";
    ctx.font = "700 20px sans-serif";
    ctx.fillText(HEAD_TEXT, 44, 30);
    ctx.fillStyle = "#ffd23f";
    ctx.font = "800 58px sans-serif";
    ctx.fillText(STREAK_TEXT.replace("{n}", String(state.streak)), 40, 86);
    ctx.fillStyle = "#fff7e6";
    ctx.font = "700 20px sans-serif";
    ctx.fillText(DONE_TEXT.replace("{c}", String(state.done)).replace("{t}", String(state.total)), 40, 164);
    ctx.fillStyle = "rgba(255, 247, 230, 0.55)";
    ctx.font = "700 18px sans-serif";
    ctx.fillText(`${d.getMonth() + 1}.${d.getDate()}`, 320, 166);
  }, [state]);

  function flash(text: string) {
    setSay(text);
    setToast(text);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setToast(""), 1400);
  }
  // 클립보드 이미지 쓰기가 막힌 환경에서는 toDataURL 링크로 내려받는다
  function download() {
    const canvas = canvasRef.current;
    if (!canvas) { return; }
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "habit-card.png";
    a.click();
    flash(SAVED_TEXT);
  }
  function copyCard() {
    setDemo(false);
    const canvas = canvasRef.current;
    if (!canvas) { return; }
    const holder = window as unknown as { ClipboardItem?: new (v: { [k: string]: Blob }) => ClipboardItem };
    if (holder.ClipboardItem && navigator.clipboard && navigator.clipboard.write && canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (!blob || !holder.ClipboardItem) { download(); return; }
        const item = new holder.ClipboardItem({ "image/png": blob });
        navigator.clipboard.write([item]).then(() => flash(COPIED_TEXT), download);
      }, "image/png");
      return;
    }
    download();
  }
  function addDay() {
    setDemo(false);
    setState({
      streak: state.streak + 1,
      done: state.done >= state.total ? 1 : state.done + 1,
      total: state.total,
    });
    flash(MADE_TEXT);
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const toastCls = [styles.toast, toast ? styles.toastOn : ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-share-network" viewBox="0 0 256 256" fill="currentColor"><g><path d="M208 200a32 32 0 1 1-32-32a32 32 0 0 1 32 32M176 88a32 32 0 1 0-32-32a32 32 0 0 0 32 32" opacity=".2"/><path d="M176 160a39.9 39.9 0 0 0-28.62 12.09l-46.1-29.63a39.8 39.8 0 0 0 0-28.92l46.1-29.63a40 40 0 1 0-8.66-13.45l-46.1 29.63a40 40 0 1 0 0 55.82l46.1 29.63A40 40 0 1 0 176 160m0-128a24 24 0 1 1-24 24a24 24 0 0 1 24-24M64 152a24 24 0 1 1 24-24a24 24 0 0 1-24 24m112 72a24 24 0 1 1 24-24a24 24 0 0 1-24 24"/></g></symbol>
        </defs>
      </svg>
      <div className={cls} style={vars}>
        <p className={styles.title}>
          <svg className={styles.ico} aria-hidden="true"><use href="#ico-share-network" /></svg>
          <span>{TITLE}</span>
        </p>
        <div className={styles.main}>
          <span className={styles.cardBox}>
            <canvas
              className={styles.canvas}
              ref={canvasRef}
              width={400}
              height={224}
              role="img"
              aria-label={CANVAS_LABEL}
            />
            <span className={toastCls} aria-hidden="true">{toast}</span>
          </span>
          <div className={styles.side}>
            <button className={styles.go} type="button" onClick={copyCard}>{COPY_TEXT}</button>
            <button className={styles.more} type="button" onClick={addDay}>{MORE_TEXT}</button>
            <p className={styles.say} role="status" aria-live="polite">{say}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
