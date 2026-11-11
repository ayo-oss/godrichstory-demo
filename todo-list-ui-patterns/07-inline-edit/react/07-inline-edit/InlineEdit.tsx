// InlineEdit — vanilla 판(run/377/demo/07-inline-edit/index.html) 의 React 포트.
// 계산 겹: 숨은 미러 span 으로 실제 텍스트 폭을 재서 input 너비를 그 값에 맞춘다.
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
// KeyboardEvent 는 "react" 스텁이 export 하지 않는다(demo.py ambient.d.ts) — lib.dom 의 전역 타입을 그대로 쓴다.
import styles from "./InlineEdit.module.scss";

type Box<T> = { current: T };

const MAX_LEN = 24;
const WARN_AT = 8;
const MIN_W = 90;
const MAX_W = 220;

const ROWS = [
  { id: 0, text: "아이스크림 사기" },
  { id: 1, text: "세탁물 찾아오기" },
  { id: 2, text: "서재 조명 교체" },
];

const SCRIPT = [
  { id: 0, append: " (편의점, 마트 둘 다)" },
  { id: 1, append: " 오늘 저녁까지" },
];

export default function InlineEdit() {
  const [isDemo, setIsDemo] = useState(true);
  const [values, setValues] = useState(ROWS.map(function (r) { return r.text; }));
  const [editing, setEditing] = useState(-1);
  const [draft, setDraft] = useState("");
  const [width, setWidth] = useState(MIN_W);
  const [shakeKey, setShakeKey] = useState(0);
  const mirrorRef = useRef(null) as unknown as Box<HTMLSpanElement>;
  const inputRef = useRef(null) as unknown as Box<HTMLInputElement | null>;
  const timerRef = useRef(0) as unknown as Box<number>;

  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function human() {
    if (isDemo) { setIsDemo(false); window.clearInterval(timerRef.current); }
  }

  function measureWidth(text: string) {
    const mirror = mirrorRef.current;
    if (!mirror) return MIN_W;
    mirror.textContent = text || " ";
    const w = mirror.getBoundingClientRect().width + 24;
    return Math.max(MIN_W, Math.min(MAX_W, w));
  }

  function startEdit(i: number) {
    human();
    setEditing(i);
    setDraft(values[i]);
    setWidth(measureWidth(values[i]));
  }

  function onDraftChange(v: string) {
    setDraft(v);
    setWidth(measureWidth(v));
    const remain = MAX_LEN - v.length;
    if (remain <= WARN_AT && !reduce) setShakeKey(function (k) { return k + 1; });
  }

  function save() {
    const i = editing;
    if (i < 0) return;
    setValues(function (prev) {
      const n = prev.slice();
      n[i] = draft.trim() || prev[i];
      return n;
    });
    setEditing(-1);
  }

  function cancel() {
    setEditing(-1);
  }

  useEffect(function () {
    if (editing >= 0 && inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  useEffect(function () {
    if (reduce) return;
    let cursor = 0;
    function autoStep() {
      const step = SCRIPT[cursor];
      cursor = (cursor + 1) % SCRIPT.length;
      startEdit(step.id);
      const base = ROWS[step.id].text;
      const full = (base + step.append).slice(0, MAX_LEN);
      let i = base.length;
      const typeIv = window.setInterval(function () {
        i++;
        const v = full.slice(0, i);
        setDraft(v);
        setWidth(measureWidth(v));
        if (i >= full.length) {
          window.clearInterval(typeIv);
          window.setTimeout(function () {
            setValues(function (prev) {
              const n = prev.slice();
              n[step.id] = v.trim() || prev[step.id];
              return n;
            });
            setEditing(-1);
          }, 260);
        }
      }, 70);
    }
    autoStep();
    timerRef.current = window.setInterval(autoStep, 1700);
    return function () { window.clearInterval(timerRef.current); };
    // eslint-disable-next-line
  }, []);

  const remain = MAX_LEN - draft.length;
  const warn = editing >= 0 && remain <= WARN_AT;

  return (
    <main className={styles.stage}>
      <ul className={styles.list + (isDemo ? " " + styles.isDemo : "")}>
        {ROWS.map(function (row, i) {
          if (editing === i) {
            return (
              <li key={row.id} className={styles.row}>
                <span className={styles.editWrap}>
                  <input
                    ref={inputRef}
                    className={styles.editInput + (warn ? " " + styles.warn : "")}
                    type="text"
                    value={draft}
                    maxLength={MAX_LEN}
                    aria-label="할 일 내용 수정"
                    style={{ width: width + "px" }}
                    onChange={function (e: ChangeEvent<HTMLInputElement>) { human(); onDraftChange(e.target.value); }}
                    onKeyDown={function (e: KeyboardEvent) {
                      human();
                      if (e.key === "Enter") { e.preventDefault(); save(); }
                      else if (e.key === "Escape") { cancel(); }
                    }}
                    onBlur={save}
                  />
                  <span key={shakeKey} className={styles.countBadge + (warn ? " " + styles.warn + " " + styles.shake : "")}>{remain}</span>
                </span>
              </li>
            );
          }
          return (
            <li key={row.id} className={styles.row}>
              <span
                className={styles.display}
                tabIndex={0}
                role="button"
                aria-label="수정하려면 선택"
                onClick={function () { startEdit(i); }}
                onKeyDown={function (e: KeyboardEvent) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startEdit(i); } }}
              >
                {values[i]}
              </span>
            </li>
          );
        })}
      </ul>
      <span ref={mirrorRef} className={styles.mirror} aria-hidden="true" />
    </main>
  );
}
