// FindReplaceBar — vanilla 판(run/299/demo/06-editor-find-replace-bar/index.html) 의 React 포트.
// Ctrl+F 로 찾기 바가 코드 위에 내려오고, 맞는 자리마다 오버레이 pre 안의 mark 로 표시가 깔린다.
// 표시는 늘 오버레이 쪽이다 — textarea 의 글자는 투명하고 색은 아래 pre 가 그린다(01 과 같은 두 겹 기법).
// 찾기·세기·이동·바꾸기 로직은 vanilla 의 escRe·hits·paint·step·replaceCur 과 같은 글자다.
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FindReplaceBar.module.scss";

export type FindReplaceBarProps = {
  duration?: number;
  easing?: string;
  color?: string;
  initialCode?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef<T> 는 T | null 을 돌려준다 — ambient 타입에 맞춰 상자 타입을 따로 둔다
type Box<T> = { current: T | null };
// ambient 에 React 이벤트 제네릭이 없다 — 쓰는 필드만 로컬 타입으로 선언한다
type KeyEvt = { key: string; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean; preventDefault(): void };
type TextEvt = { target: { value: string } };

const FILE_NAME = "tokens.scss";
const HINT = "Ctrl+F";
const FIND_LABEL = "찾기·바꾸기";
const QUERY_LABEL = "찾을 말";
const REPLACE_LABEL = "바꿀 말";
const PREV_LABEL = "이전 자리";
const NEXT_LABEL = "다음 자리";
const CLOSE_LABEL = "닫기";
const GO_LABEL = "바꾸기";
const TA_LABEL = "코드 입력칸";
const NOTE = "Enter 로 다음 자리로, 바꾸기는 지금 자리만 바꿉니다";
const COUNT_A = "3/6";
const COUNT_B = "5/6";
const QUERY = "4px";
const REPLACEMENT = "8px";
const CODE = [
  "/* spacing scale — 4px grid */",
  "$sp-1: 4px;",
  "$sp-2: 8px;",
  ".card {",
  "  padding: 4px 12px;",
  "  gap: 4px;",
  "  border-radius: 4px;",
  "}",
  ".chip { margin: 4px; }",
].join("\n");

type Hit = { s: number; e: number };

// 찾을 말을 정규식 특수문자 없이 글자 그대로 잡는다
function escRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// matchAll 로 모든 자리를 한 번에 뽑고, 몇 번째인지 셀 수 있게 시작·끝 인덱스를 남긴다
function hits(text: string, query: string): Hit[] {
  if (!query) return [];
  const re = new RegExp(escRe(query), "g");
  return Array.from(text.matchAll(re)).map((m) => {
    const at = m.index ?? 0;   // RegExpMatchArray.index 는 선택 필드다 — strict 에서 0 으로 받친다
    return { s: at, e: at + m[0].length };
  });
}

// 오버레이 pre 의 HTML 을 짓는다 — 표시(mark)는 늘 오버레이 쪽이지 textarea 가 아니다.
// cur 가 -1 이면 현재 자리 없이 깔기만 한다(격자 미리보기 경로).
function paint(text: string, list: Hit[], cur: number): string {
  let out = "";
  let at = 0;
  list.forEach((m, i) => {
    const on = i === cur;
    out += escapeHtml(text.slice(at, m.s)) +
      '<mark class="' + styles.m + (on ? " " + styles["m--cur"] : "") + '"' + (on ? ' data-cur="1"' : "") + ">" +
      escapeHtml(text.slice(m.s, m.e)) + "</mark>";
    at = m.e;
  });
  return out + escapeHtml(text.slice(at));
}

const ICON_SEARCH = (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
    <g fill="currentColor">
      <path d="M192 112a80 80 0 1 1-80-80a80 80 0 0 1 80 80" opacity=".2" />
      <path d="m229.66 218.34l-50.06-50.06a88.21 88.21 0 1 0-11.32 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72" />
    </g>
  </svg>
);

export default function FindReplaceBar(props: FindReplaceBarProps) {
  const duration = props.duration ?? 220;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#ffd23f";
  const [code, setCode] = useState<string>(props.initialCode ?? CODE);
  const [query, setQuery] = useState<string>(QUERY);
  const [replacement, setReplacement] = useState<string>(REPLACEMENT);
  const [idx, setIdx] = useState<number>(0);
  const [findOpen, setFindOpen] = useState<boolean>(false);
  const [preview, setPreview] = useState<boolean>(true);
  const taRef = useRef<HTMLTextAreaElement>(null) as Box<HTMLTextAreaElement>;
  const hlRef = useRef<HTMLPreElement>(null) as Box<HTMLPreElement>;
  const qRef = useRef<HTMLInputElement>(null) as Box<HTMLInputElement>;

  const list = useMemo(() => hits(code, query), [code, query]);
  // vanilla 의 paint() 첫 줄과 같다 — 자리 수가 줄면 처음으로 되돌아간다
  const cur = idx >= list.length ? 0 : idx;
  // 격자 미리보기 동안에는 현재 자리(주황)를 찍지 않는다 — 손으로 써 둔 오버레이와 같은 모양이다
  const html = useMemo(() => paint(code, list, preview ? -1 : cur), [code, list, cur, preview]);

  // 현재 자리를 눈에 들이고 두 겹의 가로·세로 스크롤을 맞춘다. 미리보기 루프는 건드리지 않는다
  useEffect(() => {
    if (preview) return;
    const hl = hlRef.current;
    const ta = taRef.current;
    if (!hl || !ta) return;
    const el = hl.querySelector("[data-cur]");   // CSS 모듈은 클래스 이름을 바꾸므로 표식 속성으로 찾는다
    if (el) el.scrollIntoView({ block: "nearest", inline: "nearest" });
    ta.scrollTop = hl.scrollTop;
    ta.scrollLeft = hl.scrollLeft;
  }, [html, preview]);

  // 바가 막 열린 프레임에서 찾을 말 칸을 잡는다 — 닫힌 동안은 visibility: hidden 이라 focus 가 먹지 않는다
  useEffect(() => {
    if (!findOpen) return;
    const el = qRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.select();
  }, [findOpen]);

  const openBar = () => {
    setPreview(false);
    setFindOpen(true);
    const el = qRef.current;
    if (el) {
      el.focus({ preventScroll: true });   // 이미 열려 있으면 이 자리에서 바로 잡힌다
      el.select();
    }
  };
  const closeBar = () => {
    setFindOpen(false);
    const el = taRef.current;
    if (el) el.focus({ preventScroll: true });
  };
  const step = (d: number) => {
    const n = list.length;
    if (!n) return;
    setIdx((cur + d + n) % n);
  };
  // 바꾸기는 지금 자리 하나만 — 전체 바꾸기가 아니라는 게 이 부품의 주제다
  const replaceCur = () => {
    if (!list.length) return;
    const m = list[cur];
    setCode(code.slice(0, m.s) + replacement + code.slice(m.e));
  };
  const sync = () => {
    const hl = hlRef.current;
    const ta = taRef.current;
    if (hl && ta) {
      hl.scrollTop = ta.scrollTop;
      hl.scrollLeft = ta.scrollLeft;
    }
  };

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const cls = styles.root + (preview ? " " + styles.isDemo : "") + (findOpen ? " " + styles.isFind : "");

  return (
    <main className={styles.stage}>
      <div
        className={cls}
        style={vars}
        onPointerDown={() => setPreview(false)}
        onFocus={() => setPreview(false)}
        onKeyDown={(e: KeyEvt) => {
          if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
            e.preventDefault();
            openBar();
          }
        }}
      >
        <div className={styles.bar}>
          <span className={styles.ico} aria-hidden="true">{ICON_SEARCH}</span>
          <span className={styles.name}>{FILE_NAME}</span>
          <span className={styles.hint}>{HINT}</span>
        </div>
        <div className={styles.wrap}>
          <div className={styles.find} role="group" aria-label={FIND_LABEL}>
            <div className={styles.row}>
              <span className={styles.fico} aria-hidden="true">{ICON_SEARCH}</span>
              <input
                className={styles.q}
                ref={qRef}
                type="text"
                value={query}
                placeholder={QUERY_LABEL}
                aria-label={QUERY_LABEL}
                spellCheck={false}
                autoComplete="off"
                onChange={(e: TextEvt) => {
                  setIdx(0);
                  setQuery(e.target.value);
                }}
                onKeyDown={(e: KeyEvt) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    step(e.shiftKey ? -1 : 1);
                  } else if (e.key === "Escape") {
                    closeBar();
                  }
                }}
              />
              <span className={styles.count} aria-live="polite">
                {preview ? (
                  <>
                    <span className={styles.cnum + " " + styles["cnum--a"]}>{COUNT_A}</span>
                    <span className={styles.cnum + " " + styles["cnum--b"]}>{COUNT_B}</span>
                  </>
                ) : (
                  list.length ? (cur + 1) + "/" + list.length : "0"
                )}
              </span>
              <button className={styles.nav} type="button" aria-label={PREV_LABEL} onClick={() => step(-1)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
                  <g fill="currentColor">
                    <path d="M160 48v160l-80-80Z" opacity=".2" />
                    <path d="M163.06 40.61a8 8 0 0 0-8.72 1.73l-80 80a8 8 0 0 0 0 11.32l80 80A8 8 0 0 0 168 208V48a8 8 0 0 0-4.94-7.39M152 188.69L91.31 128L152 67.31Z" />
                  </g>
                </svg>
              </button>
              <button className={styles.nav} type="button" aria-label={NEXT_LABEL} onClick={() => step(1)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
                  <g fill="currentColor">
                    <path d="m176 128l-80 80V48Z" opacity=".2" />
                    <path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z" />
                  </g>
                </svg>
              </button>
              <button className={styles.nav} type="button" aria-label={CLOSE_LABEL} onClick={closeBar}>
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
                  <g fill="currentColor">
                    <path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" />
                    <path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" />
                  </g>
                </svg>
              </button>
            </div>
            <div className={styles.row}>
              <input
                className={styles.r}
                type="text"
                value={replacement}
                placeholder={REPLACE_LABEL}
                aria-label={REPLACE_LABEL}
                spellCheck={false}
                autoComplete="off"
                onChange={(e: TextEvt) => setReplacement(e.target.value)}
                onKeyDown={(e: KeyEvt) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    replaceCur();
                  } else if (e.key === "Escape") {
                    closeBar();
                  }
                }}
              />
              <button className={styles.go} type="button" onClick={replaceCur}>{GO_LABEL}</button>
            </div>
          </div>
          <pre className={styles.hl} ref={hlRef} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
          <textarea
            className={styles.ta}
            ref={taRef}
            value={code}
            spellCheck={false}
            autoComplete="off"
            wrap="off"
            aria-label={TA_LABEL}
            onChange={(e: TextEvt) => {
              setPreview(false);
              setCode(e.target.value);
            }}
            onScroll={sync}
          />
        </div>
        <p className={styles.note}>{NOTE}</p>
      </div>
    </main>
  );
}
