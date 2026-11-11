// AutoCloseBrackets — vanilla 판(run/299/demo/03-editor-auto-close-brackets/index.html) 의 React 포트.
// 여는 짝을 치면 닫는 짝이 같이 들어가고 setSelectionRange 로 커서는 그 사이에 남는다.
// 이미 닫혀 있는 자리에서 닫는 글자를 치면 preventDefault 로 삽입을 막고 커서만 넘어가며,
// 빈 짝 가운데서 Backspace 를 치면 두 글자가 함께 지워진다.
// textarea 는 vanilla 처럼 비제어로 둔다 — setRangeText 가 값을 직접 바꾸므로 ref 로 읽어 다시 칠한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AutoCloseBrackets.module.scss";

export type AutoCloseBracketsProps = {
  duration?: number;
  easing?: string;
  color?: string;
  initialCode?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef<T> 는 T | null 을 돌려준다 — ambient 타입에 맞춰 상자 타입을 따로 둔다
type Box<T> = { current: T | null };
// ambient 타입에 React 이벤트 제네릭이 없다 — 쓰는 것만 로컬 타입으로 선언한다
type KeyEvt = { key: string; preventDefault(): void };

const LABEL = "코드 입력칸";
const NOTE = "닫는 짝은 저절로 들어가고, 그 자리에서 한 번 더 치면 삽입 없이 지나갑니다";
const FILE_NAME = "auto-close.js";
const LBL_IDLE = "자동 닫기";
const LBL_INSERT = "짝 삽입";
const LBL_PASS = "통과";
const LBL_DROP = "짝 삭제";
// 미리보기에서 겹켜놓고 컷으로 갈아 끼우는 상태 값 장 — vanilla 와 같은 글자다
const STATE_VIEWS = [LBL_INSERT, LBL_PASS, LBL_DROP];
const KEYS = ["(", ")", "Backspace", "("];
const CODE = "fade()";

const PAIRS: { [k: string]: string } = { "(": ")", "{": "}", "[": "]", '"': '"', "'": "'" };

type Part = { text: string; pair: boolean };

// 커서 왼쪽의 여는 짝과 오른쪽의 닫는 짝이 맞으면 그 두 글자를 따로 떼어 색을 입힌다
function split(value: string, caret: number): Part[] {
  let open = -1;
  if (caret > 0 && PAIRS[value.charAt(caret - 1)] === value.charAt(caret)) open = caret - 1;
  const out: Part[] = [];
  let seg = "";
  const flush = () => {
    if (seg) {
      out.push({ text: seg, pair: false });
      seg = "";
    }
  };
  for (let i = 0; i < value.length; i++) {
    if (i === open || i === open + 1) {
      flush();
      out.push({ text: value.charAt(i), pair: true });
    } else {
      seg += value.charAt(i);
    }
  }
  flush();
  return out;
}

export default function AutoCloseBrackets(props: AutoCloseBracketsProps) {
  const duration = props.duration ?? 220;
  const easing = props.easing ?? "cubic-bezier(.2, 1.4, .4, 1)";
  const color = props.color ?? "#0a4fe8";
  const code = props.initialCode ?? CODE;
  const [preview, setPreview] = useState<boolean>(true);
  const [parts, setParts] = useState<Part[]>(split(code, 0));
  const [label, setLabel] = useState<string>(LBL_IDLE);
  const [keys, setKeys] = useState<string[]>(KEYS);
  const [keyOn, setKeyOn] = useState<boolean>(false);
  const taRef = useRef<HTMLTextAreaElement>(null) as Box<HTMLTextAreaElement>;
  const hlRef = useRef<HTMLPreElement>(null) as Box<HTMLPreElement>;

  const leave = () => setPreview(false);

  // 키 기록 줄 — 최근 네 키가 오른쪽으로 밀려 마지막 칸이 켜진다
  const logKey = (k: string) => {
    setKeys((prev: string[]) => prev.slice(1).concat([k]));
    setKeyOn(true);
  };

  const render = () => {
    const ta = taRef.current;
    const hl = hlRef.current;
    if (!ta) return;
    setParts(split(ta.value, ta.selectionStart));
    // 줄이 늘어나 본문이 스크롤하면 아래 pre 도 같은 값으로 맞춘다
    if (hl) hl.scrollTop = ta.scrollTop;
  };

  const onKeyDown = (e: KeyEvt) => {
    leave();
    const ta = taRef.current;
    if (!ta) return;
    const k = e.key;
    const v = ta.value;
    const s = ta.selectionStart;
    const t = ta.selectionEnd;
    const over = s === t && v.charAt(s) === k && (PAIRS[k] === k || ")}]".indexOf(k) >= 0);
    if (PAIRS[k] && !over) {
      // 여는 짝 — 닫는 짝을 같이 넣고 setSelectionRange 로 커서는 그 사이에 남긴다
      e.preventDefault();
      const inner = v.slice(s, t);
      ta.setRangeText(k + inner + PAIRS[k], s, t, "end");
      ta.setSelectionRange(s + 1, s + 1 + inner.length);
      setLabel(LBL_INSERT);
    } else if (over) {
      // 이미 닫혀 있는 자리 — 삽입하지 않고 커서만 넘어간다
      e.preventDefault();
      ta.setSelectionRange(s + 1, s + 1);
      setLabel(LBL_PASS);
    } else if (k === "Backspace" && s === t && s > 0 && PAIRS[v.charAt(s - 1)] === v.charAt(s)) {
      // 커서가 빈 짝 가운데서 Backspace — 두 글자를 함께 지운다
      e.preventDefault();
      ta.setRangeText("", s - 1, s + 1, "end");
      ta.setSelectionRange(s - 1, s - 1);
      setLabel(LBL_DROP);
    }
    if (k.length === 1 || k === "Backspace" || k === "Enter" || k === "Tab") logKey(k);
    render();
  };

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    render();
    // 시작 커서는 짝 가운데 — 손을 대지 않은 첫 화면에서 이어 치면 그 자리에서 시작한다
    ta.setSelectionRange(5, 5);
  }, []);

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const last = keys.length - 1;

  return (
    <main className={styles.stage}>
      <div className={styles.root + (preview ? " " + styles.isDemo : "")} style={vars}>
        <div className={styles.bar}>
          <span className={styles.ico} aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
              <g fill="currentColor">
                <path d="M240 128c-64 0 0 88-64 88H80c-64 0 0-88-64-88c64 0 0-88 64-88h96c64 0 0 88 64 88" opacity=".2" />
                <path d="M43.18 128a29.8 29.8 0 0 1 8 10.26c4.8 9.9 4.8 22 4.8 33.74c0 24.31 1 36 24 36a8 8 0 0 1 0 16c-17.48 0-29.32-6.14-35.2-18.26c-4.8-9.9-4.8-22-4.8-33.74c0-24.31-1-36-24-36a8 8 0 0 1 0-16c23 0 24-11.69 24-36c0-11.72 0-23.84 4.8-33.74C50.68 38.14 62.52 32 80 32a8 8 0 0 1 0 16c-23 0-24 11.69-24 36c0 11.72 0 23.84-4.8 33.74A29.8 29.8 0 0 1 43.18 128M240 120c-23 0-24-11.69-24-36c0-11.72 0-23.84-4.8-33.74C205.32 38.14 193.48 32 176 32a8 8 0 0 0 0 16c23 0 24 11.69 24 36c0 11.72 0 23.84 4.8 33.74a29.8 29.8 0 0 0 8 10.26a29.8 29.8 0 0 0-8 10.26c-4.8 9.9-4.8 22-4.8 33.74c0 24.31-1 36-24 36a8 8 0 0 0 0 16c17.48 0 29.32-6.14 35.2-18.26c4.8-9.9 4.8-22 4.8-33.74c0-24.31 1-36 24-36a8 8 0 0 0 0-16" />
              </g>
            </svg>
          </span>
          <span className={styles.name}>{FILE_NAME}</span>
          <span className={styles.pill}>
            <span className={styles.state}>{label}</span>
            {STATE_VIEWS.map((text, i) => (
              <span key={i} className={styles.sv + " " + styles["sv" + (i + 1)]} aria-hidden="true">
                {text}
              </span>
            ))}
          </span>
        </div>
        <div className={styles.wrap} onPointerDown={leave}>
          <pre className={styles.hl} ref={hlRef} aria-hidden="true">
            <span className={styles.ln}>
              {parts.length === 0
                ? " "
                : parts.map((part, i) => (
                    <span key={i} className={part.pair ? styles.pp : styles.txt}>
                      {part.text}
                    </span>
                  ))}
            </span>
          </pre>
          <span className={styles.pline} aria-hidden="true" />
          <span className={styles.ping} aria-hidden="true" />
          <span className={styles.caret} aria-hidden="true" />
          <textarea
            className={styles.ta}
            ref={taRef}
            defaultValue={code}
            spellCheck={false}
            autoComplete="off"
            wrap="off"
            aria-label={LABEL}
            onKeyDown={onKeyDown}
            onChange={() => {
              leave();
              render();
            }}
            onKeyUp={render}
            onClick={render}
            onFocus={() => {
              leave();
              render();
            }}
            onScroll={() => {
              const ta = taRef.current;
              const hl = hlRef.current;
              if (ta && hl) hl.scrollTop = ta.scrollTop;
            }}
          />
        </div>
        <div className={styles.keys} aria-hidden="true">
          {keys.map((text, i) => (
            <span key={i} className={styles.k + (keyOn && i === last ? " " + styles.isOn : "")}>
              <span className={styles.kt}>{text}</span>
              <span className={styles.kfill}>{text}</span>
            </span>
          ))}
        </div>
        <p className={styles.note}>{NOTE}</p>
      </div>
    </main>
  );
}
