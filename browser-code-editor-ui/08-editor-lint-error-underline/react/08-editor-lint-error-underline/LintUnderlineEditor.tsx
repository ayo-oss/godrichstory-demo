// LintUnderlineEditor — vanilla 판(run/299/demo/08-editor-lint-error-underline/index.html) 의 React 포트.
// 글자를 투명하게 만든 textarea 를 같은 자리·같은 서체의 pre 위에 얹고, 간이 린트가 잡은 범위만
// 물결 밑줄 span 으로 감싼다. 린트 규칙 둘(괄호 짝·색 코드 자릿수)과 그 순서는 vanilla 와 같은 글자다.
// 접근성 경로는 툴팁이 아니라 상태 줄이다 — textarea 의 aria-describedby 가 상태 줄을 가리킨다.
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LintUnderlineEditor.module.scss";

export type LintUnderlineEditorProps = {
  duration?: number;
  easing?: string;
  color?: string;
  initialCode?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef<T> 는 T | null 을 돌려준다 — ambient 타입에 맞춰 상자 타입을 따로 둔다
type Box<T> = { current: T | null };
// 이벤트 파라미터는 로컬 타입으로 받는다 — DOM 전역 타입을 "react" 에서 가져오면 tsc 가 죽는다
type PointerEvt = { clientX: number; clientY: number };

const LABEL = "코드 입력칸";
const HINT = "물결 위에 올려 보세요";
const FILE_NAME = "style.scss";
const COUNT_TPL = "{n} 오류";
const MSG_BRACKET = ["닫히지 않은 괄호", "열린 괄호에 닫는 짝이 없습니다"];
const MSG_HEX = ["자릿수가 틀린 색 코드", "16진수와 3·4·6·8 자리만 유효합니다"];
const HEX_DIGITS = [3, 4, 6, 8]; // 유효한 색 코드 자릿수. 4자리(#ff41 처럼 알파 1바이트)도 유효하고 5·7자리가 아니다
const STATUS_ID = "lintStatus";
const TIP_SLOTS = 2;
const CODE = [
  "/* badge colors */",
  ".badge {",
  "  color: #ff41;",
  "}",
  ".card {",
  "  color: #ff412;",
  "",
].join("\n");

type LintErr = { start: number; end: number; msg: string[] };
type Metric = { w: number; lh: number; x: number; y: number };

// 간이 린트 — 두 규칙만. ① 색 코드: # 뒤가 16진수이고 자릿수가 3·4·6·8 중 하나여야 한다
// (# 뒤에 16진수가 아닌 글자가 붙어도 묶어서 오류로 잡는다). ② 괄호 짝: 스택으로 짝을 짓고
// 끝까지 안 닫힌 여는 괄호를 오류로 남긴다. 결과는 글자 인덱스 오름차순.
function lint(text: string): LintErr[] {
  const errs: LintErr[] = [];
  const hexRe = /#[0-9a-zA-Z]+/g;
  let m = hexRe.exec(text);
  while (m !== null) {
    const body = m[0].slice(1);
    const ok = /^[0-9a-fA-F]+$/.test(body) && HEX_DIGITS.indexOf(body.length) >= 0;
    if (!ok) errs.push({ start: m.index, end: m.index + m[0].length, msg: MSG_HEX });
    m = hexRe.exec(text);
  }
  const stack: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    if (ch === "{" || ch === "(" || ch === "[") stack.push(i);
    else if (ch === "}" || ch === ")" || ch === "]") {
      if (stack.length) stack.pop();
      else errs.push({ start: i, end: i + 1, msg: MSG_BRACKET });
    }
  }
  stack.forEach((p) => errs.push({ start: p, end: p + 1, msg: MSG_BRACKET }));
  errs.sort((a, b) => a.start - b.start);
  return errs;
}

function lineStartsOf(text: string): number[] {
  const lines = text.split("\n");
  const starts = [0];
  lines.forEach((l, i) => {
    if (i) starts.push(starts[i - 1] + lines[i - 1].length + 1);
  });
  return starts;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 투명 textarea 아래 pre 를 다시 그린다. 주석 줄은 흐리게, 오류 범위는 물결 span 으로 감싼다
function paint(text: string, errs: LintErr[], starts: number[]): string {
  return text
    .split("\n")
    .map((line, ln) => {
      const lead = starts[ln];
      const com = line.replace(/^\s+/, "").indexOf("/*") === 0;
      const local: { s: number; t: number; ei: number }[] = [];
      errs.forEach((e, ei) => {
        if (e.start >= lead && e.end <= lead + line.length) local.push({ s: e.start - lead, t: e.end - lead, ei: ei });
      });
      let out = "";
      let pos = 0;
      local.forEach((x) => {
        out += escapeHtml(line.slice(pos, x.s)) + '<span class="' + styles.err + '" data-e="' + x.ei + '">' +
          escapeHtml(line.slice(x.s, x.t)) + "</span>";
        pos = x.t;
      });
      out += escapeHtml(line.slice(pos));
      const cls = styles.ln + (com ? " " + styles["ln--com"] : "");
      return '<span class="' + cls + '">' + (out || "​") + "</span>";
    })
    .join("");
}

// 한 글자 폭과 줄 높이를 pre 안에서 실측한다 — 폰 폭에서 서체 크기가 줄어도 따라간다
function metric(hl: HTMLPreElement): Metric {
  const probe = document.createElement("span");
  probe.className = styles.probe;
  probe.textContent = "0000000000";
  hl.appendChild(probe);
  const cs = getComputedStyle(hl);
  const m: Metric = {
    w: probe.getBoundingClientRect().width / 10,
    lh: parseFloat(cs.lineHeight),
    x: parseFloat(cs.paddingLeft),
    y: parseFloat(cs.paddingTop),
  };
  probe.remove();
  return m;
}

export default function LintUnderlineEditor(props: LintUnderlineEditorProps) {
  const duration = props.duration ?? 2000;
  const easing = props.easing ?? "cubic-bezier(.2, .8, .2, 1)";
  const color = props.color ?? "#ffd23f";
  const [code, setCode] = useState<string>(props.initialCode ?? CODE);
  const [preview, setPreview] = useState<boolean>(true);
  const [openIdx, setOpenIdx] = useState<number>(-1);
  const wrapRef = useRef<HTMLDivElement>(null) as Box<HTMLDivElement>;
  const hlRef = useRef<HTMLPreElement>(null) as Box<HTMLPreElement>;
  const taRef = useRef<HTMLTextAreaElement>(null) as Box<HTMLTextAreaElement>;
  const tipARef = useRef<HTMLDivElement>(null) as Box<HTMLDivElement>;
  const tipBRef = useRef<HTMLDivElement>(null) as Box<HTMLDivElement>;

  const errs = useMemo(() => lint(code), [code]);
  const starts = useMemo(() => lineStartsOf(code), [code]);
  const html = useMemo(() => paint(code, errs, starts), [code, errs, starts]);

  // 툴팁 두 개를 각 오류 줄 위(래핑 상자 안)에 둔다 — 아래로 삐져나오면 scrollHeight 가 커진다.
  // 가로는 오른쪽 끝을 넘지 않게 묶는다.
  useEffect(() => {
    const place = () => {
      const hl = hlRef.current;
      const wrap = wrapRef.current;
      if (!hl || !wrap) return;
      const m = metric(hl);
      const tips = [tipARef.current, tipBRef.current];
      errs.slice(0, TIP_SLOTS).forEach((e, i) => {
        const tip = tips[i];
        if (!tip) return;
        let ln = 0;
        while (ln + 1 < starts.length && starts[ln + 1] <= e.start) ln++;
        tip.style.left = "0px";
        const left = m.x + (e.start - starts[ln]) * m.w;
        const top = m.y + ln * m.lh - tip.offsetHeight - 4;
        const maxL = wrap.clientWidth - tip.offsetWidth - 4;
        tip.style.left = Math.max(4, Math.min(left, maxL)) + "px";
        tip.style.top = Math.max(0, top) + "px";
      });
    };
    place();
    setOpenIdx(-1);
    // 창 폭이 바뀌면 줄 높이가 달라진다 — 툴팁 자리를 다시 잡는다
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [errs, starts]);

  // 포인터 위치를 글자 인덱스로 바꾼다 — 고정폭 서체라 한 글자 폭으로 열을 잰다
  const charIndex = (px: number, py: number): number => {
    const hl = hlRef.current;
    if (!hl) return -1;
    const m = metric(hl);
    const ln = Math.floor((py - m.y) / m.lh);
    if (ln < 0 || ln >= starts.length) return -1;
    const col = Math.round((px - m.x) / m.w);
    const lineLen = code.split("\n")[ln].length;
    return starts[ln] + Math.max(0, Math.min(col, lineLen));
  };

  const openAt = (idx: number) => {
    let hit = -1;
    errs.forEach((e, i) => {
      if (i < TIP_SLOTS && idx >= e.start && idx <= e.end) hit = i;
    });
    setOpenIdx(hit);
  };

  const sync = () => {
    const ta = taRef.current;
    const hl = hlRef.current;
    if (ta && hl) {
      hl.scrollTop = ta.scrollTop;
      hl.scrollLeft = ta.scrollLeft;
    }
  };

  const tipClass = (i: number, extra: string) =>
    styles.tip + " " + extra + (openIdx === i ? " " + styles.isOpen : "");

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const count = COUNT_TPL.replace("{n}", String(errs.length));

  return (
    <main className={styles.stage}>
      <div className={styles.root + (preview ? " " + styles.isDemo : "")} style={vars}>
        <div className={styles.bar}>
          <span className={styles.ico} aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
              <g fill="currentColor">
                <path d="M215.46 216H40.54c-12.62 0-20.54-13.21-14.41-23.91l87.46-151.87c6.3-11 22.52-11 28.82 0l87.46 151.87c6.13 10.7-1.79 23.91-14.41 23.91" opacity=".2" />
                <path d="M236.8 188.09L149.35 36.22a24.76 24.76 0 0 0-42.7 0L19.2 188.09a23.51 23.51 0 0 0 0 23.72A24.35 24.35 0 0 0 40.55 224h174.9a24.35 24.35 0 0 0 21.33-12.19a23.51 23.51 0 0 0 .02-23.72m-13.87 15.71a8.5 8.5 0 0 1-7.48 4.2H40.55a8.5 8.5 0 0 1-7.48-4.2a7.59 7.59 0 0 1 0-7.72l87.45-151.87a8.75 8.75 0 0 1 15 0l87.45 151.87a7.59 7.59 0 0 1-.04 7.72M120 144v-40a8 8 0 0 1 16 0v40a8 8 0 0 1-16 0m20 36a12 12 0 1 1-12-12a12 12 0 0 1 12 12" />
              </g>
            </svg>
          </span>
          <span className={styles.name}>{FILE_NAME}</span>
        </div>
        <div className={styles.wrap} ref={wrapRef} onPointerDown={() => setPreview(false)}>
          <span className={styles.scan} aria-hidden="true" />
          <pre className={styles.hl} ref={hlRef} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
          <div className={tipClass(0, styles.tipA)} ref={tipARef} aria-hidden="true">
            {errs.length > 0 ? <b>{errs[0].msg[0]}</b> : null}
            {errs.length > 0 ? errs[0].msg[1] : null}
          </div>
          <div className={tipClass(1, styles.tipB)} ref={tipBRef} aria-hidden="true">
            {errs.length > 1 ? <b>{errs[1].msg[0]}</b> : null}
            {errs.length > 1 ? errs[1].msg[1] : null}
          </div>
          <textarea
            className={styles.ta}
            ref={taRef}
            value={code}
            wrap="off"
            spellCheck={false}
            autoComplete="off"
            aria-label={LABEL}
            aria-describedby={STATUS_ID}
            onChange={(e: { target: { value: string } }) => {
              setPreview(false);
              setCode(e.target.value);
            }}
            onScroll={sync}
            onFocus={() => setPreview(false)}
            onPointerMove={(ev: PointerEvt) => {
              const ta = taRef.current;
              if (!ta) return;
              const r = ta.getBoundingClientRect();
              openAt(charIndex(ev.clientX - r.left, ev.clientY - r.top));
            }}
            onPointerLeave={() => setOpenIdx(-1)}
            // 키보드로도 이유를 본다 — 커서가 오류 범위에 있으면 그 툴팁이 열린다
            onKeyUp={() => {
              const ta = taRef.current;
              if (ta) openAt(ta.selectionStart);
            }}
          />
        </div>
        <p className={styles.status} id={STATUS_ID} role="status">
          <span className={styles.chip} data-n={String(errs.length)}>
            {/* 미리보기 중에는 이 글자를 CSS 가 감추고 아래 세 장을 컷으로 갈아 낸다 — 상태 글자는 건드리지 않는다 */}
            <span className={styles.count}>{count}</span>
            <span className={styles.countd} aria-hidden="true">
              <b>0 오류</b>
              <b>1 오류</b>
              <b>2 오류</b>
            </span>
          </span>
          <span className={styles.hint}>{HINT}</span>
        </p>
      </div>
    </main>
  );
}
