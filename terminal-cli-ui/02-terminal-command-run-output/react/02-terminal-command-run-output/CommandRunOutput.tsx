// CommandRunOutput — vanilla 판(run/294/demo/02-terminal-command-run-output/index.html) 의 React 포트.
// 친 명령을 되울리고 출력 줄이 --i 만큼 시차를 두고 쌓인다. 작업 줄은 스피너가 한 바퀴 돈 뒤
// 완료 표시로 바뀌고, 요약 줄은 그 뒤에야 찍힌다 — 실제 실행에서도 스피너가 멎은 다음이다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CommandRunOutput.module.scss";

export type CommandRunOutputProps = {
  /** 격자 미리보기용 2초 자동 루프. 명령을 한 번 실행하면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type LineVars = CSSProperties & { "--i"?: string };
/** React 이벤트 제네릭이 ambient 에 없어 쓰는 필드만 지역 타입으로 선언한다 */
type FormEvt = { preventDefault(): void };
type InputEvt = { target: { value: string } };
type Box<T> = { current: T };

type Line = { id: number; text: string; kind: string; index: number; done: boolean };

const SCRIPTS: { [k: string]: string[] } = {
  build: ["resolving 12 modules", "bundling src/index.ts", "WORK:writing dist", "SUM:done in 1.2s"],
  ls: ["dist  src  package.json  README.md"],
  help: ["build   bundle the project", "ls      list files", "clear   wipe the screen"],
  clear: [],
};
/** 작업이 끝나기까지 주는 시간 — 실제 작업이라면 여기가 fetch 의 then 자리다 */
const WORK_MS = 900;
const INITIAL: Line[] = [
  { id: 1, text: "$ build", kind: "echo", index: 0, done: false },
  { id: 2, text: "resolving 12 modules", kind: "", index: 1, done: false },
  { id: 3, text: "bundling src/index.ts", kind: "", index: 2, done: false },
  { id: 4, text: "writing dist", kind: "work", index: 3, done: false },
  { id: 5, text: "done in 1.2s", kind: "sum", index: 4, done: false },
];

function kindClass(kind: string) {
  if (kind === "echo") { return styles.lineEcho; }
  if (kind === "bad") { return styles.lineBad; }
  if (kind === "sum") { return styles.lineSum; }
  if (kind === "work") { return styles.lineWork; }
  return "";
}

export default function CommandRunOutput({
  demo = true,
  duration = 600,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2b9d74",
}: CommandRunOutputProps) {
  const [live, setLive] = useState(demo);
  const [lines, setLines] = useState<Line[]>(INITIAL);
  const [value, setValue] = useState("");
  const timers = useRef<number[]>([]) as Box<number[]>;
  const seq = useRef<number>(INITIAL.length) as Box<number>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    return () => { clearTimers(); };
  }, []);

  function clearTimers() {
    timers.current.forEach((id) => { window.clearTimeout(id); });
    timers.current = [];
  }

  function nextId() {
    seq.current += 1;
    return seq.current;
  }

  function run(cmd: string) {
    clearTimers();
    if (cmd === "clear") { setLines([]); return; }
    const steps = SCRIPTS[cmd];
    const next: Line[] = [{ id: nextId(), text: `$ ${cmd}`, kind: "echo", index: 0, done: false }];
    if (!steps) {
      next.push({ id: nextId(), text: `command not found: ${cmd}`, kind: "bad", index: 1, done: false });
      setLines(next);
      return;
    }
    steps.forEach((text, i) => {
      if (text.indexOf("WORK:") === 0) {
        const id = nextId();
        next.push({ id: id, text: text.slice(5), kind: "work", index: i + 1, done: false });
        // 스피너가 한 바퀴 돌 시간을 주고 완료 표시로 바꾼다
        timers.current.push(window.setTimeout(() => {
          setLines((prev) => prev.map((l) => (l.id === id ? { ...l, done: true } : l)));
        }, WORK_MS));
      } else if (text.indexOf("SUM:") === 0) {
        // 요약 줄은 작업이 끝난 뒤에 찍힌다 — 스피너가 도는 동안 먼저 나오면 거짓말이 된다
        const sum: Line = { id: nextId(), text: text.slice(4), kind: "sum", index: i + 1, done: false };
        timers.current.push(window.setTimeout(() => {
          setLines((prev) => prev.concat([sum]));
        }, WORK_MS));
      } else {
        next.push({ id: nextId(), text: text, kind: "", index: i + 1, done: false });
      }
    });
    setLines(next);
  }

  function submit(e: FormEvt) {
    e.preventDefault();
    setLive(false);
    const cmd = value.trim();
    if (cmd) { run(cmd); }
    setValue("");
  }

  const cls = [styles.root, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <div className={cls}>
        <p className={styles.bar}>
          <span className={styles.ico} aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M224 56v144a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V56a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8" opacity=".2" /><path d="M128 128a8 8 0 0 1-3 6.25l-40 32a8 8 0 1 1-10-12.5L107.19 128L75 102.25a8 8 0 1 1 10-12.5l40 32a8 8 0 0 1 3 6.25m48 24h-40a8 8 0 0 0 0 16h40a8 8 0 0 0 0-16m56-96v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16m-16 144V56H40v144z" /></g></svg>
          </span>
          <span className={styles.name}>빌드 터미널</span>
        </p>
        <div className={styles.out} role="log" aria-live="polite">
          {lines.map((l) => {
            const lineVars: LineVars = { "--i": String(l.index) };
            const lineCls = [styles.line, kindClass(l.kind), l.done ? styles.isDone : ""].filter(Boolean).join(" ");
            if (l.kind === "work") {
              return (
                <p className={lineCls} key={l.id} style={lineVars}>
                  <span className={styles.mark} aria-hidden="true">
                    <span className={styles.spin} />
                    <span className={styles.tick}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2" /><path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32" /></g></svg>
                    </span>
                  </span>
                  <span className={styles.workText}>{l.text}</span>
                </p>
              );
            }
            return <p className={lineCls} key={l.id} style={lineVars}>{l.text}</p>;
          })}
        </div>
        <form className={styles.form} onSubmit={submit}>
          <span className={styles.sign} aria-hidden="true">$</span>
          <input
            className={styles.input}
            type="text"
            autoComplete="off"
            placeholder="명령을 입력하고 Enter"
            aria-label="실행할 명령"
            value={value}
            onChange={(e: InputEvt) => setValue(e.target.value)}
          />
        </form>
      </div>
    </main>
  );
}
