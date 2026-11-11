// KeypadCalculator — vanilla 판(run/080/demo/02-keypad-calculator/index.html) 의 React 포트.
// 표시줄 하나와 4×5 키패드(grid-template-areas). 계산 상태는 넷이다:
// acc(왼쪽 값) · op(대기 중인 연산자) · fresh(다음 숫자가 새 입력인가) · shown(표시 문자열).
// 상태 넷은 렌더마다 살아 있어야 해서 ref 한 통에 넣고, 화면에 나가는 shown 만 useState 로 둔다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./KeypadCalculator.module.scss";

export type KeypadCalculatorProps = {
  duration?: number;
  easing?: string;
  accentColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault(): void };
type Machine = { acc: number; op: string; fresh: boolean; shown: string };
type MachineBox = { current: Machine };   // ambient 의 useRef 는 T|null 을 돌려주므로 단언용
type KeyDef = { k: string; label: string; kind: string; aria: string; shortcut: string };

const ERR = "오류";
const ERR_WHY = "0 으로는 못 나눠요";
const HINT = "키보드로도 눌러요";
const CLEAR_LABEL = "전체 지우기";
const BACK_LABEL = "한 글자 지우기";
const DIV_LABEL = "나누기";
const MUL_LABEL = "곱하기";
const SUB_LABEL = "빼기";
const ADD_LABEL = "더하기";
const DOT_LABEL = "소수점";
const EQ_LABEL = "계산";

// Phosphor Duotone backspace — [20% 채움 경로, 본 경로]
const BACK_PATHS: [string, string] = [
  "M224 56v144a8 8 0 0 1-8 8H68.53a8 8 0 0 1-6.86-3.88L16 128l45.67-76.12A8 8 0 0 1 68.53 48H216a8 8 0 0 1 8 8",
  "M216 40H68.53a16.08 16.08 0 0 0-13.72 7.77L9.14 123.88a8 8 0 0 0 0 8.24l45.67 76.11A16.08 16.08 0 0 0 68.53 216H216a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16M61.67 204.12l6.86-4.12ZM216 200H68.53l-43.2-72l43.2-72H216Zm-109.66-53.66L124.69 128l-18.35-18.34a8 8 0 0 1 11.32-11.32L136 116.69l18.34-18.35a8 8 0 0 1 11.32 11.32L147.31 128l18.35 18.34a8 8 0 0 1-11.32 11.32L136 139.31l-18.34 18.35a8 8 0 0 1-11.32-11.32",
];

const KEYS: KeyDef[] = [
  { k: "clear", label: "C", kind: "fn", aria: CLEAR_LABEL, shortcut: "Escape" },
  { k: "back", label: "", kind: "fn", aria: BACK_LABEL, shortcut: "Backspace" },
  { k: "pct", label: "%", kind: "fn", aria: "", shortcut: "%" },
  { k: "/", label: "÷", kind: "op", aria: DIV_LABEL, shortcut: "/" },
  { k: "7", label: "7", kind: "", aria: "", shortcut: "7" },
  { k: "8", label: "8", kind: "", aria: "", shortcut: "8" },
  { k: "9", label: "9", kind: "", aria: "", shortcut: "9" },
  { k: "*", label: "×", kind: "op", aria: MUL_LABEL, shortcut: "*" },
  { k: "4", label: "4", kind: "", aria: "", shortcut: "4" },
  { k: "5", label: "5", kind: "", aria: "", shortcut: "5" },
  { k: "6", label: "6", kind: "", aria: "", shortcut: "6" },
  { k: "-", label: "−", kind: "op", aria: SUB_LABEL, shortcut: "-" },
  { k: "1", label: "1", kind: "", aria: "", shortcut: "1" },
  { k: "2", label: "2", kind: "", aria: "", shortcut: "2" },
  { k: "3", label: "3", kind: "", aria: "", shortcut: "3" },
  { k: "+", label: "+", kind: "op", aria: ADD_LABEL, shortcut: "+" },
  { k: "0", label: "0", kind: "", aria: "", shortcut: "0" },
  { k: ".", label: ".", kind: "", aria: DOT_LABEL, shortcut: "." },
  { k: "=", label: "=", kind: "eq", aria: EQ_LABEL, shortcut: "Enter" },
];

function calc(a: number, b: number, o: string): number | null {
  if (o === "+") { return a + b; }
  if (o === "-") { return a - b; }
  if (o === "*") { return a * b; }
  return b === 0 ? null : a / b;
}
function fmt(n: number): string {
  return String(Math.round(n * 1e10) / 1e10);
}

export default function KeypadCalculator({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  accentColor = "#0a4fe8",
}: KeypadCalculatorProps) {
  const [shown, setShown] = useState("0");
  const [demo, setDemo] = useState(true);
  const [hint, setHint] = useState(HINT);
  const box = useRef<Machine>({ acc: 0, op: "", fresh: true, shown: "0" }) as MachineBox;

  function show(v: string) {
    box.current.shown = v;
    setShown(v);
  }
  // 표시줄은 짧은 '오류' 만, 이유는 작은 힌트 줄에 — 26px 자리에 문장을 넣으면 패널을 넘친다
  function fail() {
    box.current = { acc: 0, op: "", fresh: true, shown: "0" };
    setShown(ERR);
    setHint(ERR_WHY);
  }
  function digit(d: string) {
    const m = box.current;
    if (m.fresh) { m.fresh = false; show(d === "." ? "0." : d); return; }
    if (d === "." && m.shown.indexOf(".") >= 0) { return; }
    show(m.shown === "0" && d !== "." ? d : m.shown + d);
  }
  function operator(o: string) {
    const m = box.current;
    const v = Number(m.shown);
    if (m.op !== "" && !m.fresh) {
      const r = calc(m.acc, v, m.op);
      if (r === null) { fail(); return; }
      m.acc = r;
      show(fmt(r));
    } else { m.acc = v; }
    m.op = o;
    m.fresh = true;
  }
  function equals() {
    const m = box.current;
    if (m.op === "") { m.fresh = true; return; }
    const r = calc(m.acc, Number(m.shown), m.op);
    if (r === null) { fail(); return; }
    m.acc = r;
    m.op = "";
    m.fresh = true;
    show(fmt(r));
  }
  function back() {
    const m = box.current;
    const s = m.shown.slice(0, -1);
    if (s === "" || s === "-") { m.fresh = true; show("0"); return; }
    show(s);
  }
  function press(k: string) {
    setDemo(false);
    setHint(HINT);
    const m = box.current;
    if ("0123456789.".indexOf(k) >= 0) { digit(k); }
    else if ("+-*/".indexOf(k) >= 0) { operator(k); }
    else if (k === "=") { equals(); }
    else if (k === "back") { back(); }
    else if (k === "pct") { m.fresh = true; show(fmt(Number(m.shown) / 100)); }
    else { box.current = { acc: 0, op: "", fresh: true, shown: "0" }; show("0"); }
  }

  useEffect(() => {
    const onKey = (e: KeyEvt) => {
      let k = e.key;
      if (k === "Enter" || k === "=") { k = "="; }
      else if (k === "Backspace") { k = "back"; }
      else if (k === "Escape") { k = "clear"; }
      else if (k === "%") { k = "pct"; }
      else if (k === "" || "0123456789.+-*/".indexOf(k) < 0) { return; }
      e.preventDefault();
      press(k);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": accentColor };
  const rootCls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const kindCls: { [k: string]: string } = { fn: styles.keyFn, op: styles.keyOp, eq: styles.keyEq };

  return (
    <main className={styles.stage}>
      <div className={rootCls} style={vars}>
        <div className={styles.out}>
          <span className={styles.hint}>{hint}</span>
          <b className={`${styles.val} ${styles.cut1}`}>{shown}</b>
          <b className={`${styles.val} ${styles.cut2}`} aria-hidden="true">7</b>
          <b className={`${styles.val} ${styles.cut3}`} aria-hidden="true">8</b>
          <b className={`${styles.val} ${styles.cut4}`} aria-hidden="true">56</b>
        </div>
        <div className={styles.pad}>
          {KEYS.map((def) => (
            <button
              key={def.k}
              className={[styles.key, kindCls[def.kind] || ""].filter(Boolean).join(" ")}
              type="button"
              data-k={def.k}
              aria-label={def.aria || undefined}
              aria-keyshortcuts={def.shortcut}
              onClick={() => press(def.k)}
            >
              {def.k === "back" ? (
                <svg className={styles.ic} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
                  <g fill="currentColor">
                    <path d={BACK_PATHS[0]} opacity=".2" />
                    <path d={BACK_PATHS[1]} />
                  </g>
                </svg>
              ) : def.label}
            </button>
          ))}
          <span className={styles.ghost} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
