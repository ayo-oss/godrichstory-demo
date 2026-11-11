// AutocompletePopup — vanilla 판(run/299/demo/07-editor-autocomplete-popup/index.html) 의 React 포트.
// 치던 낱말(조각)로 startsWith 좁히기를 하고, 거울 요소로 잰 커서 x 좌표 바로 아래에
// role="listbox" 팝업을 띄운다. 화살표로 고르고(aria-activedescendant 갱신) Enter 로 조각을 갈아 끼운다.
// wordAt·candidates·caretX·place·insert 는 vanilla 와 같은 글자다 (값을 다시 타이핑하지 않는다).
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AutocompletePopup.module.scss";

export type AutocompletePopupProps = {
  duration?: number;
  easing?: string;
  color?: string;
  initialValue?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef<T> 는 T | null 을 돌려준다 — ambient 타입에 맞춰 상자 타입을 따로 둔다
type Box<T> = { current: T | null };
// ambient 에 React 이벤트 제네릭이 없다 — 쓰는 필드만 로컬 타입으로 선언한다
type KeyEvt = { key: string; preventDefault(): void };
type TextEvt = { target: { value: string; selectionStart: number | null } };

const FILE_NAME = "query.box";
const HINT = "키워드 12개";
const TA_LABEL = "쿼리 입력칸";
const POP_LABEL = "후보 목록";
const KEYS_LABEL = "키워드";
const NOTE = "치던 낱말로 좁혀지고 화살표로 골라 Enter 로 넣습니다";
const VALUE = "document.q";
const DEMO_BASE = "document.";
const DEMO_FRAG = "q";

// 정해진 키워드 목록 — 치던 낱말(조각)로 startsWith 좁히기를 한다
const KEYS = ["document", "documentElement", "querySelector", "querySelectorAll",
  "getElementById", "getElementsByClassName", "getElementsByTagName",
  "getAttribute", "setAttribute", "addEventListener", "removeEventListener",
  "requestAnimationFrame"];

type Word = { start: number; text: string };

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 커서 바로 앞의 낱말 조각 — 마지막 비단어 문자(점·공백) 뒤부터 커서까지가 조각이다
function wordAt(v: string, pos: number): Word {
  let i = pos;
  while (i > 0 && /[\w$]/.test(v[i - 1])) i--;
  return { start: i, text: v.slice(i, pos) };
}
function candidates(word: string): string[] {
  return KEYS.filter((k) => k.toLowerCase().startsWith(word.toLowerCase()));
}

// 오버레이를 다시 그린다 — 치던 조각에 밑줄이 깔린다
function paint(v: string, w: Word): string {
  return escapeHtml(v.slice(0, w.start))
    + (w.text ? '<span class="' + styles.word + '">' + escapeHtml(w.text) + "</span>" : "")
    + escapeHtml(v.slice(w.start + w.text.length));
}

export default function AutocompletePopup(props: AutocompletePopupProps) {
  const duration = props.duration ?? 220;
  const easing = props.easing ?? "cubic-bezier(.2, 1.4, .4, 1)";
  const color = props.color ?? "#2f6df6";
  const start = props.initialValue ?? VALUE;
  const [value, setValue] = useState<string>(start);
  const [pos, setPos] = useState<number>(start.length);
  const [sel, setSel] = useState<number>(0);
  const [escaped, setEscaped] = useState<boolean>(false);
  const [preview, setPreview] = useState<boolean>(true);
  const [left, setLeft] = useState<number>(0);
  const taRef = useRef<HTMLTextAreaElement>(null) as Box<HTMLTextAreaElement>;
  const mirrorRef = useRef<HTMLSpanElement>(null) as Box<HTMLSpanElement>;
  const popRef = useRef<HTMLDivElement>(null) as Box<HTMLDivElement>;
  const pendingRef = useRef<number>(-1) as Box<number>;   // Enter 삽입 뒤 옮겨 둘 커서 자리

  const word = useMemo(() => wordAt(value, pos), [value, pos]);
  const list = useMemo(() => (word.text ? candidates(word.text) : []), [word]);
  // vanilla 의 update() 첫 줄과 같다 — 후보가 줄면 처음으로 되돌아간다
  const cur = sel >= list.length ? 0 : sel;
  const open = !escaped && list.length > 0;
  const html = useMemo(() => paint(value, word), [value, word]);
  // 격자 미리보기 동안에는 손으로 써 둔 후보를 그대로 두고 좌표만 잡는다
  const caretAt = preview ? value.length : pos;

  // 거울 요소 — 입력칸과 같은 서체로 커서 앞 글자를 재서 커서 x 좌표를 잰다.
  // 팝업 왼쪽을 그 x 에 맞추고, 오른쪽 끝을 넘으면 안으로 접는다
  useEffect(() => {
    const ta = taRef.current;
    const mirror = mirrorRef.current;
    const pop = popRef.current;
    if (!ta || !mirror || !pop) return;
    const pad = parseFloat(getComputedStyle(ta).paddingLeft) || 0;
    const x = pad + mirror.offsetWidth - ta.scrollLeft;
    const maxX = ta.clientWidth - pop.offsetWidth - 4;
    setLeft(Math.max(0, Math.min(x, Math.max(0, maxX))));
  }, [value, caretAt, preview, open]);

  // 삽입 직후에만 커서를 옮긴다 — 사람이 잡아 둔 자리를 매 렌더마다 뺏지 않으려는 가드다
  useEffect(() => {
    const ta = taRef.current;
    const want = pendingRef.current;
    if (!ta || want === null || want < 0) return;
    pendingRef.current = -1;
    ta.setSelectionRange(want, want);
  }, [value]);

  // 커서만 움직인 경로(화살표·클릭) — 조각을 다시 재고 팝업을 되살린다
  const syncPos = () => {
    const ta = taRef.current;
    if (!ta) return;
    setPos(ta.selectionStart ?? 0);
    setEscaped(false);
  };

  // Enter — 치던 조각을 통째로 갈아 끼운다 (조각만 바뀌고 앞뒤는 그대로)
  const insert = () => {
    const w = wordAt(value, pos);
    const cands = candidates(w.text);
    const k = cands[cur] || cands[0];
    if (!k) return;
    const next = w.start + k.length;
    pendingRef.current = next;
    setValue(value.slice(0, w.start) + k + value.slice(w.start + w.text.length));
    setPos(next);
    setEscaped(false);
  };

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const cls = styles.root + (preview ? " " + styles.isDemo : "") + (!preview && open ? " " + styles.isOpen : "");

  return (
    <main className={styles.stage}>
      <div
        className={cls}
        style={vars}
        onPointerDown={() => setPreview(false)}
        onFocus={() => setPreview(false)}
      >
        <div className={styles.bar}>
          <span className={styles.ico} aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
              <g fill="currentColor">
                <path d="m240 128l-48 40H64l-48-40l48-40h128Z" opacity=".2" />
                <path d="M69.12 94.15L28.5 128l40.62 33.85a8 8 0 1 1-10.24 12.29l-48-40a8 8 0 0 1 0-12.29l48-40a8 8 0 0 1 10.24 12.3m176 27.7l-48-40a8 8 0 1 0-10.24 12.3L227.5 128l-40.62 33.85a8 8 0 1 0 10.24 12.29l48-40a8 8 0 0 0 0-12.29m-82.39-89.37a8 8 0 0 0-10.25 4.79l-64 176a8 8 0 0 0 4.79 10.26A8.1 8.1 0 0 0 96 224a8 8 0 0 0 7.52-5.27l64-176a8 8 0 0 0-4.79-10.25" />
              </g>
            </svg>
          </span>
          <span className={styles.name}>{FILE_NAME}</span>
          <span className={styles.hint}>{HINT}</span>
        </div>
        <div className={styles.field}>
          <span className={styles.mirror} ref={mirrorRef} aria-hidden="true">{value.slice(0, caretAt)}</span>
          {preview ? (
            <pre className={styles.hl} aria-hidden="true">
              <span className={styles.line}>
                <span className={styles.base}>{DEMO_BASE}</span>
                <span className={styles.frag + " " + styles["frag--a"]}>
                  {DEMO_BASE}<span className={styles.caret} />
                </span>
                <span className={styles.frag + " " + styles["frag--b"]}>
                  {DEMO_BASE}<span className={styles.u}>{DEMO_FRAG}</span><span className={styles.caret} />
                </span>
              </span>
            </pre>
          ) : (
            <pre className={styles.hl} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
          )}
          <textarea
            className={styles.ta}
            ref={taRef}
            value={value}
            rows={1}
            spellCheck={false}
            autoComplete="off"
            wrap="off"
            aria-label={TA_LABEL}
            aria-expanded={!preview && open ? "true" : "false"}
            aria-autocomplete="list"
            aria-controls="ac-pop"
            onChange={(e: TextEvt) => {
              setPreview(false);
              setSel(0);
              setEscaped(false);
              setValue(e.target.value);
              setPos(e.target.selectionStart ?? e.target.value.length);
            }}
            onClick={syncPos}
            onKeyUp={(e: KeyEvt) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") syncPos();
            }}
            onKeyDown={(e: KeyEvt) => {
              if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                e.preventDefault();
                const n = list.length;
                setSel((cur + (e.key === "ArrowDown" ? 1 : -1) + n) % n);
              } else if (open && e.key === "Enter") {
                e.preventDefault();
                insert();
              } else if (e.key === "Escape") {
                setEscaped(true);
              }
            }}
          />
          <div
            className={styles.pop}
            id="ac-pop"
            ref={popRef}
            role="listbox"
            aria-label={POP_LABEL}
            aria-activedescendant={preview ? "ac-opt0" : (open ? "ac-opt" + cur : undefined)}
            style={{ left: left + "px" }}
          >
            {preview ? (
              <>
                <div className={styles.opt + " " + styles["opt--a"]} id="ac-opt0" role="option" aria-selected="true">{KEYS[2]}</div>
                <div className={styles.opt + " " + styles["opt--b"]} id="ac-opt1" role="option" aria-selected="false">{KEYS[3]}</div>
              </>
            ) : (
              list.map((k, i) => (
                <div key={k} className={styles.opt} id={"ac-opt" + i} role="option" aria-selected={i === cur}>{k}</div>
              ))
            )}
          </div>
        </div>
        <div className={styles.keys} aria-hidden="true">
          <span className={styles.klabel}>{KEYS_LABEL}</span>
          {KEYS.map((k) => (<span className={styles.k} key={k}>{k}</span>))}
        </div>
        <p className={styles.note}>{NOTE}</p>
      </div>
    </main>
  );
}
