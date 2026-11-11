// TabIndentEditor — vanilla 판(run/299/demo/04-editor-tab-indent-selection/index.html) 의 React 포트.
// Tab 은 두 칸 들여쓰고 Shift+Tab 은 두 칸 되돌린다. 여러 줄을 잡고 누르면 잡힌 줄 전체가 같이 움직이고
// selectionStart/End 는 첫 줄·마지막 줄이 밀린 만큼 다시 계산되어 남는다 (vanilla 의 indentBlock 과 같은 식).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TabIndentEditor.module.scss";

export type TabIndentEditorProps = {
  duration?: number;
  easing?: string;
  color?: string;
  initialCode?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef<T> 는 T | null 을 돌려준다 — ambient 타입에 맞춰 상자 타입을 따로 둔다
type Box<T> = { current: T | null };
// ambient 에 React 이벤트 제네릭이 없다 — 쓰는 속성만 적은 로컬 타입을 파일 안에 둔다
type KeyEvt = { key: string; shiftKey: boolean; preventDefault(): void };
type ChangeEvt = { target: { value: string; selectionStart: number; selectionEnd: number } };

const LABEL = "코드 입력칸";
const NOTE = "여러 줄을 잡고 Tab 을 누르면 줄 전체가 같이 움직입니다";
const FILE_NAME = "deploy.yml";
const KEY_TAB = "Tab";
const KEY_SHIFT_TAB = "Shift+Tab";
// 문구 템플릿은 화면 글자와 같은 근원에서 읽는다 — 언어팩이 값을 바꿔도 조립 규칙이 함께 바뀐다
const TPL_SEL = "{a}~{b}줄 선택";
const TPL_CARET = "{n}번 줄 커서";
const TPL_LINES = "{n}줄";
// 미리보기에 겹쳐 두는 두 문장. 밴드가 켜지는 순간 CSS 가 둘을 갈아 끼운다
const PREVIEW_CARET = "1번 줄 커서";
const PREVIEW_SEL = "3~5줄 선택";

const NL = "\n";
const INDENT = "  "; // 두 칸
const CODE = ["# deploy config", "deploy:", "build: scss", "minify: true", "upload: pages"].join(NL);
// 미리보기 유령 판에서 선택 밴드가 깔리는 줄 (vanilla 의 ti__ln--sel 과 같은 자리)
const GHOST_SEL = [2, 3, 4];

type Edit = { value: string; start: number; end: number };

function lineAt(v: string, pos: number): number {
  return v.slice(0, pos).split(NL).length;
}

// 여러 줄 잡기: 잡힌 줄 전체가 같이 들여쓰기/내어쓰기되고 selectionStart/End 는 그 바뀐 만큼 다시 계산된다
function indentBlock(dir: number, v: string, s: number, e: number): Edit {
  const ls = v.lastIndexOf(NL, s - 1) + 1;
  let ne = v.indexOf(NL, e);
  if (ne === -1) ne = v.length;
  const lines = v.slice(ls, ne).split(NL);
  let firstShift = 0;
  let lastShift = 0;
  const moved = lines.map((ln, i) => {
    if (dir > 0) {
      if (i === 0) firstShift = INDENT.length;
      if (i === lines.length - 1) lastShift = INDENT.length;
      return INDENT + ln;
    }
    const lead = ln.match(/^ {1,2}/);
    const cut = lead ? lead[0].length : 0;
    if (i === 0) firstShift = -cut;
    if (i === lines.length - 1) lastShift = -cut;
    return ln.slice(cut);
  });
  // 선택 범위 재계산: 시작은 첫 줄의 밀린 만큼, 끝은 마지막 줄의 밀린 만큼 따라간다
  return {
    value: v.slice(0, ls) + moved.join(NL) + v.slice(ne),
    start: Math.max(ls, s + firstShift),
    end: Math.max(ls + 1, e + lastShift),
  };
}

export default function TabIndentEditor(props: TabIndentEditorProps) {
  const duration = props.duration ?? 220;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#ffd23f";
  const [code, setCode] = useState<string>(props.initialCode ?? CODE);
  const [sel, setSel] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [preview, setPreview] = useState<boolean>(true);
  const taRef = useRef<HTMLTextAreaElement>(null) as Box<HTMLTextAreaElement>;
  // Tab 이 만든 다음 선택 범위. 값이 그려진 뒤에 setSelectionRange 로 놓아야 커서가 제자리에 선다
  const pending = useRef<{ start: number; end: number }>(null) as Box<{ start: number; end: number }>;

  useEffect(() => {
    const ta = taRef.current;
    const p = pending.current;
    if (ta && p) {
      ta.setSelectionRange(p.start, p.end);
      pending.current = null;
    }
  }, [code]);

  const report = () => {
    const ta = taRef.current;
    if (ta) setSel({ start: ta.selectionStart, end: ta.selectionEnd });
  };

  const onKeyDown = (ev: KeyEvt) => {
    if (ev.key !== "Tab") return;
    ev.preventDefault();
    setPreview(false);
    const ta = taRef.current;
    if (!ta) return;
    const v = ta.value;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    let next: Edit | null = null;
    if (v.slice(s, e).indexOf(NL) === -1) {
      // 한 줄 안에서는 Tab 이 그 자리에 두 칸, Shift+Tab 이 줄 머리에서 두 칸을 지운다
      if (!ev.shiftKey) {
        next = { value: v.slice(0, s) + INDENT + v.slice(e), start: s + INDENT.length, end: s + INDENT.length };
      } else {
        const ls = v.lastIndexOf(NL, s - 1) + 1;
        const tail = v.slice(ls, s).match(/ *$/);
        const cut = Math.min(INDENT.length, tail ? tail[0].length : 0);
        if (cut) next = { value: v.slice(0, s - cut) + v.slice(s), start: s - cut, end: s - cut };
      }
    } else {
      next = indentBlock(ev.shiftKey ? -1 : 1, v, s, e);
    }
    if (!next) return;
    pending.current = { start: next.start, end: next.end };
    setSel({ start: next.start, end: next.end });
    setCode(next.value);
  };

  const status =
    sel.end > sel.start && code.slice(sel.start, sel.end).indexOf(NL) !== -1
      ? TPL_SEL.replace("{a}", String(lineAt(code, sel.start))).replace("{b}", String(lineAt(code, sel.end)))
      : TPL_CARET.replace("{n}", String(lineAt(code, sel.start)));
  const lineCount = TPL_LINES.replace("{n}", String(code.split(NL).length));

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div className={styles.root + (preview ? " " + styles.isDemo : "")} style={vars}>
        <div className={styles.bar}>
          <span className={styles.ico} aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
              <g fill="currentColor">
                <path d="M216 64v128H104V64Z" opacity=".2" />
                <path d="M224 128a8 8 0 0 1-8 8H104a8 8 0 0 1 0-16h112a8 8 0 0 1 8 8M104 72h112a8 8 0 0 0 0-16H104a8 8 0 0 0 0 16m112 112H104a8 8 0 0 0 0 16h112a8 8 0 0 0 0-16M43.58 55.16L48 52.94V104a8 8 0 0 0 16 0V40a8 8 0 0 0-11.58-7.16l-16 8a8 8 0 0 0 7.16 14.32m36.19 101.56a23.73 23.73 0 0 0-9.6-15.95a24.86 24.86 0 0 0-34.11 4.7a23.6 23.6 0 0 0-3.57 6.46a8 8 0 1 0 15 5.47a7.8 7.8 0 0 1 1.18-2.13a8.76 8.76 0 0 1 12-1.59a7.9 7.9 0 0 1 3.26 5.32a7.64 7.64 0 0 1-1.57 5.78a1 1 0 0 0-.08.11l-28.69 38.32A8 8 0 0 0 40 216h32a8 8 0 0 0 0-16H56l19.08-25.53a23.47 23.47 0 0 0 4.69-17.75" />
              </g>
            </svg>
          </span>
          <span className={styles.name}>{FILE_NAME}</span>
          <span className={styles.key + " " + styles.keyTab} aria-hidden="true">{KEY_TAB}</span>
          <span className={styles.key + " " + styles.keySft} aria-hidden="true">{KEY_SHIFT_TAB}</span>
        </div>
        <div className={styles.wrap} onPointerDown={() => setPreview(false)}>
          <pre className={styles.ghost} aria-hidden="true">
            {CODE.split(NL).map((ln, i) => (
              <span key={i} className={styles.ln + (GHOST_SEL.indexOf(i) !== -1 ? " " + styles.lnSel : "")}>
                <span className={styles.tx}>{ln}</span>
              </span>
            ))}
          </pre>
          <textarea
            className={styles.ta}
            ref={taRef}
            value={code}
            spellCheck={false}
            autoComplete="off"
            aria-label={LABEL}
            onKeyDown={onKeyDown}
            onChange={(e: ChangeEvt) => {
              setPreview(false);
              setSel({ start: e.target.selectionStart, end: e.target.selectionEnd });
              setCode(e.target.value);
            }}
            onKeyUp={report}
            onMouseUp={report}
            onSelect={report}
            onFocus={() => setPreview(false)}
          />
        </div>
        <p className={styles.meta}>
          <span className={styles.status}>
            {preview ? (
              <>
                <span className={styles.stCaret}>{PREVIEW_CARET}</span>
                <span className={styles.stSel}>{PREVIEW_SEL}</span>
              </>
            ) : (
              status
            )}
          </span>
          <span className={styles.lines}>{lineCount}</span>
        </p>
        <p className={styles.note}>{NOTE}</p>
      </div>
    </main>
  );
}
