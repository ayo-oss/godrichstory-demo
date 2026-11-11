// SyntaxHighlightEditor — vanilla 판(run/299/demo/01-editor-live-syntax-highlight/index.html) 의 React 포트.
// 글자를 투명하게 만든 textarea 를 같은 자리·같은 서체의 pre 위에 얹고, 입력이 들어오면 pre 만 다시 칠한다.
// 토크나이저 규칙 네 줄과 그 순서는 vanilla 와 같은 글자다 (값을 다시 타이핑하지 않는다).
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SyntaxHighlightEditor.module.scss";

export type SyntaxHighlightEditorProps = {
  duration?: number;
  easing?: string;
  color?: string;
  initialCode?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef<T> 는 T | null 을 돌려준다 — ambient 타입에 맞춰 상자 타입을 따로 둔다
type Box<T> = { current: T | null };

const LABEL = "코드 입력칸";
const NOTE = "입력하면 같은 자리에서 색이 다시 칠해집니다";
const COUNT = "4색";
const FILE_NAME = "style.scss";
const CODE = [
  "/* card rise */",
  ".card {",
  "  --lift: 8px;",
  '  content: "rise";',
  "  color: #fff7e6;",
  "  transition: all 220ms ease;",
  "}",
].join("\n");

type Rule = { cls: string; re: RegExp };
type Mark = { start: number; end: number; cls: string };

// 토크나이저 규칙 네 줄. 앞의 규칙이 먼저 이긴다 — 주석 안의 색 코드를 색으로 잡지 않으려는 순서다
const RULES: Rule[] = [
  { cls: "c", re: /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g },
  { cls: "s", re: /"[^"\n]*"|'[^'\n]*'/g },
  { cls: "n", re: /#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|ms|s|%|em|rem|fr)?\b/g },
  { cls: "k", re: /--[a-zA-Z][\w-]*|\.[a-zA-Z][\w-]*|@[a-z-]+|\b[a-z-]+(?=\s*:)/g },
];

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function paint(line: string): string {
  const marks: Mark[] = [];
  RULES.forEach((rule) => {
    rule.re.lastIndex = 0;
    let m = rule.re.exec(line);
    while (m !== null) {
      const start = m.index;
      const end = m.index + m[0].length;
      const taken = marks.some((x) => start < x.end && x.start < end);
      if (!taken) marks.push({ start, end, cls: rule.cls });
      if (m[0] === "") rule.re.lastIndex++;
      m = rule.re.exec(line);
    }
  });
  marks.sort((a, b) => a.start - b.start);
  let out = "";
  let at = 0;
  marks.forEach((x) => {
    if (x.start < at) return;
    out += escapeHtml(line.slice(at, x.start)) + '<span class="' + styles.t + " " + styles["t--" + x.cls] + '">' +
      escapeHtml(line.slice(x.start, x.end)) + "</span>";
    at = x.end;
  });
  return out + escapeHtml(line.slice(at));
}

export default function SyntaxHighlightEditor(props: SyntaxHighlightEditorProps) {
  const duration = props.duration ?? 220;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#2b9d74";
  const [code, setCode] = useState<string>(props.initialCode ?? CODE);
  const [preview, setPreview] = useState<boolean>(true);
  const taRef = useRef<HTMLTextAreaElement>(null) as Box<HTMLTextAreaElement>;
  const hlRef = useRef<HTMLPreElement>(null) as Box<HTMLPreElement>;

  // 줄마다 span 으로 감싼다 — 미리보기 루프가 줄 단위로 켜고 끌 수 있어야 한다
  const lines = useMemo(() => code.split("\n").map((line) => paint(line) || "​"), [code]);

  useEffect(() => {
    const ta = taRef.current;
    const hl = hlRef.current;
    if (ta && hl) {
      hl.scrollTop = ta.scrollTop;
      hl.scrollLeft = ta.scrollLeft;
    }
  }, [code]);

  const sync = () => {
    const ta = taRef.current;
    const hl = hlRef.current;
    if (ta && hl) {
      hl.scrollTop = ta.scrollTop;
      hl.scrollLeft = ta.scrollLeft;
    }
  };

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div className={styles.root + (preview ? " " + styles.isDemo : "")} style={vars}>
        <div className={styles.bar}>
          <span className={styles.ico} aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
              <g fill="currentColor">
                <path d="M216 48v160H40V48Z" opacity=".2" />
                <path d="m69.12 94.15l-2.63-2.62a8 8 0 0 1 0-11.32l32-32a8 8 0 0 1 11.31 11.32L83.31 88l26.5 26.5a8 8 0 0 1-11.31 11.31Zm117.76 67.7l2.63 2.62a8 8 0 0 0 0-11.32l-32-32a8 8 0 0 0-11.31 11.32L172.69 168l-26.5 26.5a8 8 0 0 0 11.31 11.31Z" />
                <path d="M168 42.15a8 8 0 0 0-9.85 5.53l-48 168a8 8 0 0 0 5.53 9.85a8.5 8.5 0 0 0 2.16.3a8 8 0 0 0 7.69-5.8l48-168a8 8 0 0 0-5.53-9.88" />
              </g>
            </svg>
          </span>
          <span className={styles.name}>{FILE_NAME}</span>
          <span className={styles.count}>{COUNT}</span>
        </div>
        <div className={styles.wrap} onPointerDown={() => setPreview(false)}>
          <pre
            className={styles.hl}
            ref={hlRef}
            aria-hidden="true"
            dangerouslySetInnerHTML={{
              __html: lines.map((html) => '<span class="' + styles.ln + '">' + html + "</span>").join(""),
            }}
          />
          <span className={styles.sweep} aria-hidden="true" />
          <textarea
            className={styles.ta}
            ref={taRef}
            value={code}
            spellCheck={false}
            autoComplete="off"
            aria-label={LABEL}
            onChange={(e: { target: { value: string } }) => {
              setPreview(false);
              setCode(e.target.value);
            }}
            onScroll={sync}
            onFocus={() => setPreview(false)}
          />
        </div>
        <p className={styles.note}>{NOTE}</p>
      </div>
    </main>
  );
}
