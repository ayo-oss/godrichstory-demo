// LineNumberGutter — vanilla 판(run/299/demo/02-editor-line-number-gutter/index.html) 의 React 포트.
// 왼쪽 거터의 번호가 입력 줄 수를 따라 늘고 줄며, selectionStart 로 잰 커서 줄만 배경이 켜진다.
// 본문이 스크롤하면 거터 트랙도 같은 translateY 값을 받아 붙어 다닌다.
// 번호 자체는 scss 의 counter-reset 이 매긴다 — 여기서는 빈 칸만 줄 수만큼 그린다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LineNumberGutter.module.scss";

export type LineNumberGutterProps = {
  duration?: number;
  easing?: string;
  color?: string;
  initialCode?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef<T> 는 T | null 을 돌려준다 — ambient 타입에 맞춰 상자 타입을 따로 둔다
type Box<T> = { current: T | null };

const LABEL = "코드 입력칸";
const NOTE = "Enter 를 치면 번호가 늘고, 커서가 있는 줄만 밝아집니다";
const FILE_NAME = "editor.scss";
const LBL_COUNT = "{n}줄";
// 미리보기에서 겹켜놓고 컷으로 갈아 끼우는 줄 수 값 장 — vanilla 와 같은 글자다
const COUNT_VIEWS = ["3줄", "4줄", "5줄", "6줄", "5줄"];
const CODE = [
  "/* gutter demo */",
  ".panel {",
  "  margin: 8px;",
  "  line-height: 20px;",
  "  transform: translateY(4px);",
  "}",
].join("\n");

export default function LineNumberGutter(props: LineNumberGutterProps) {
  const duration = props.duration ?? 220;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#ffd23f";
  const [code, setCode] = useState<string>(props.initialCode ?? CODE);
  const [preview, setPreview] = useState<boolean>(true);
  const [caretY, setCaretY] = useState<number>(0);
  const [scrollY, setScrollY] = useState<number>(0);
  const taRef = useRef<HTMLTextAreaElement>(null) as Box<HTMLTextAreaElement>;

  const lines = code.split("\n");

  // 본문이 스크롤하면 두 트랙을 같은 값으로 옮긴다 — 두 겹이 어긋나지 않는 핵심
  const sync = () => {
    const ta = taRef.current;
    if (ta) setScrollY(-ta.scrollTop);
  };

  // selectionStart 까지의 글자에서 몇째 줄인지 계산해 두 밴드를 같은 값으로 옮긴다
  const update = () => {
    const ta = taRef.current;
    if (!ta) return;
    const raw = parseFloat(getComputedStyle(ta).lineHeight);
    const lh = raw > 0 ? raw : 20;
    const idx = ta.value.slice(0, ta.selectionStart).split("\n").length - 1;
    setCaretY(idx * lh);
    setScrollY(-ta.scrollTop);
  };

  // 시작 커서는 셋째 줄 끝 — 손을 대지 않은 첫 화면부터 현재 줄 밴드가 보인다
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    const p = ta.value.split("\n").slice(0, 3).join("\n").length;
    ta.setSelectionRange(p, p);
    update();
  }, []);

  const leave = () => setPreview(false);
  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const bandStyle: CSSProperties = { transform: "translateY(" + caretY + "px)" };
  const trackStyle: CSSProperties = { transform: "translateY(" + scrollY + "px)" };

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
          <span className={styles.pill}>
            <span className={styles.count}>{LBL_COUNT.replace("{n}", String(lines.length))}</span>
            {COUNT_VIEWS.map((text, i) => (
              <span key={i} className={styles.cv + " " + styles["cv" + (i + 1)]} aria-hidden="true">
                {text}
              </span>
            ))}
          </span>
        </div>
        <div className={styles.body}>
          <div className={styles.gut} aria-hidden="true">
            <div className={styles.gtrack} style={trackStyle}>
              {lines.map((_line, i) => (
                <span key={i} className={styles.num} />
              ))}
              <span className={styles.gcur} style={bandStyle} />
            </div>
          </div>
          <div className={styles.wrap} onPointerDown={leave}>
            <div className={styles.track} style={trackStyle}>
              <span className={styles.cur} style={bandStyle} aria-hidden="true" />
              <pre className={styles.hl} aria-hidden="true">
                {lines.map((line, i) => (
                  <span key={i} className={styles.ln}>
                    {line || " "}
                  </span>
                ))}
              </pre>
            </div>
            <textarea
              className={styles.ta}
              ref={taRef}
              value={code}
              spellCheck={false}
              autoComplete="off"
              wrap="off"
              aria-label={LABEL}
              onChange={(e: { target: { value: string } }) => {
                leave();
                setCode(e.target.value);
                update();
              }}
              onKeyUp={() => {
                leave();
                update();
              }}
              onClick={() => {
                leave();
                update();
              }}
              onFocus={() => {
                leave();
                update();
              }}
              onScroll={sync}
            />
          </div>
        </div>
        <p className={styles.note}>{NOTE}</p>
      </div>
    </main>
  );
}
