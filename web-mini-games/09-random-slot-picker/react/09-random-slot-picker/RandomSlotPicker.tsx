// RandomSlotPicker — vanilla 판(run/080/demo/09-random-slot-picker/index.html) 의 React 포트.
// 후보 이름을 네 벌 이어 붙인 세로 트랙을 칸 단위로 밀어 올린다. 창은 세 칸이고 가운데가 당첨 자리다.
// 멈춘 뒤 offset 을 후보 수로 나눈 나머지로 되돌리는데, 그 한 번만 transition 을 끊어야 한다 —
// vanilla 는 리플로를 강제했고 여기서는 noTrans 를 한 프레임만 켠다(같은 결과, React 방식).
// 후보 목록은 localStorage 키 하나(p080-09)에 JSON 으로 넣는다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RandomSlotPicker.module.scss";

export type RandomSlotPickerProps = {
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string; "--easing"?: string; "--color"?: string; "--rows"?: string;
};
type TransEvt = { propertyName: string };   // React 제네릭 대신 로컬 타입

const KEY = "p080-09";
const BASE = ["지민", "서연", "도윤", "하은", "민준", "수아", "예준", "유나"];
const TITLE = "랜덤 슬롯 뽑기";
const COUNT_LABEL = "명 후보";
const GO_LABEL = "뽑기";
const DROP_LABEL = "당첨자 빼기";
const RESET_LABEL = "후보 되돌리기";
const WIN = "{n} 당첨!";
const SPINNING = "돌리는 중";
const HELP = "뽑기를 누르면 시작합니다";
const GHOST_WIN = "서연 당첨!";
const COPIES = 4;

function loadNames(): string[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || "null");
    if (raw && raw.names && raw.names.length > 1) { return raw.names.slice(); }
  } catch (e) { /* 저장소가 막힌 창은 기본 후보로 */ }
  return BASE.slice();
}
function saveNames(names: string[]) {
  try { window.localStorage.setItem(KEY, JSON.stringify({ names: names })); } catch (e) { /* 건너뛴다 */ }
}

export default function RandomSlotPicker({
  duration = 2000,
  easing = "ease-out",
  accentColor = "#0a4fe8",
}: RandomSlotPickerProps) {
  const [list, setList] = useState<string[]>(BASE);
  const [offset, setOffset] = useState(0);
  const [noTrans, setNoTrans] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(HELP);
  const [winner, setWinner] = useState("");
  const [demo, setDemo] = useState(true);
  const busyRef = useRef(false);
  const vars: Vars = {
    "--duration": `${duration}ms`, "--easing": easing,
    "--color": accentColor, "--rows": String(list.length),
  };

  useEffect(() => { setList(loadNames()); }, []);
  useEffect(() => {
    if (!noTrans) { return; }
    const id = window.requestAnimationFrame(() => setNoTrans(false));
    return () => { window.cancelAnimationFrame(id); };
  }, [noTrans]);

  function spin() {
    if (busyRef.current || list.length < 2) { return; }
    busyRef.current = true;
    setDemo(false);
    setBusy(true);
    setMsg(SPINNING);
    setWinner("");
    setOffset(offset + list.length + Math.floor(Math.random() * list.length));
  }
  function onEnd(e: TransEvt) {
    if (e.propertyName !== "transform") { return; }
    const norm = offset % list.length;
    const name = list[(norm + 1) % list.length];
    setNoTrans(true);
    setOffset(norm);
    setWinner(name);
    setMsg(WIN.replace("{n}", name));
    busyRef.current = false;
    setBusy(false);
  }
  function drop() {
    setDemo(false);
    const i = list.indexOf(winner);
    if (busyRef.current || i < 0 || list.length < 3) { return; }
    const next = list.filter((_, k) => k !== i);
    saveNames(next);
    setNoTrans(true);
    setList(next);
    setOffset(0);
    setWinner("");
    setMsg(HELP);
  }
  function reset() {
    setDemo(false);
    if (busyRef.current) { return; }
    saveNames(BASE);
    setNoTrans(true);
    setList(BASE.slice());
    setOffset(0);
    setWinner("");
    setMsg(HELP);
  }

  const rows: string[] = [];
  for (let c = 0; c < COPIES; c++) { list.forEach((n) => rows.push(n)); }

  return (
    <main className={styles.stage}>
      <div className={[styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ")} style={vars}>
        <header className={styles.bar}>
          <p className={styles.title}>{TITLE}</p>
          <p className={styles.count}>
            <b className={styles.countNum}>{list.length}</b>
            <span className={styles.countLabel}>{COUNT_LABEL}</span>
          </p>
        </header>

        <div className={styles.body}>
          <div className={styles.window}>
            <div
              className={[styles.track, noTrans ? styles.noTrans : ""].filter(Boolean).join(" ")}
              style={{ transform: `translateY(calc(var(--row) * ${-offset}))` }}
              onTransitionEnd={onEnd}
            >
              {rows.map((n, i) => (<div key={i} className={styles.item}>{n}</div>))}
            </div>
            <span className={styles.frame} aria-hidden="true" />
          </div>
          <div className={styles.side}>
            <button className={`${styles.btn} ${styles.btnGo}`} type="button" disabled={busy} onClick={spin}>{GO_LABEL}</button>
            <button className={styles.btn} type="button" onClick={drop}>{DROP_LABEL}</button>
            <button className={styles.btn} type="button" onClick={reset}>{RESET_LABEL}</button>
          </div>
        </div>

        <div className={styles.out}>
          <p className={[styles.banner, winner ? styles.isWin : ""].filter(Boolean).join(" ")} aria-live="polite">{msg}</p>
          <p className={`${styles.ghost} ${styles.ghostA}`} aria-hidden="true">{SPINNING}</p>
          <p className={`${styles.ghost} ${styles.ghostB}`} aria-hidden="true">{GHOST_WIN}</p>
        </div>
      </div>
    </main>
  );
}
