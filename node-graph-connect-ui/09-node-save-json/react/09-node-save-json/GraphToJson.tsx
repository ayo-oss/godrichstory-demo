import { useEffect, useRef, useState } from "react";
import styles from "./GraphToJson.module.scss";

export type GraphToJsonProps = { duration?: number; easing?: string; color?: string };

type Box<T> = { current: T };
type GraphNode = { id: string; x: number; y: number };
type GraphLink = { from: string; to: string };

const NODES = [
  { id: "in", name: "입력", left: "6%", top: "8%", inPort: false, outPort: true },
  { id: "map", name: "변환", left: "34%", top: "42%", inPort: true, outPort: true },
  { id: "out", name: "출력", left: "6%", top: "74%", inPort: true, outPort: false },
];
const WIRES = ["M52,51 C52,67 94,67 94,82", "M94,118 C94,132 52,132 52,145"];
const FAIL = "복사 실패 — 글자를 직접 선택하세요";
const DONE = "N줄 복사했어요";

export default function GraphToJson({ duration = 2000, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: GraphToJsonProps) {
  const [demo, setDemo] = useState(true);
  const [json, setJson] = useState("");
  const [toast, setToast] = useState("29줄 복사했어요");
  const [shown, setShown] = useState(false);
  const boardRef = useRef<any>(null) as Box<any>;
  const codeRef = useRef<any>(null) as Box<any>;
  const nodeRefs = useRef<any[]>([]) as Box<any[]>;

  const rootStyle = { "--ngDur": duration + "ms", "--ngEase": easing, "--ngColor": color } as { [k: string]: string };

  useEffect(() => {
    // 화면에 놓인 노드를 그대로 훑어 객체로 만든다 — 아래 글자는 전부 이 객체에서 나온 것이다
    const board = boardRef.current;
    if (!board) return;
    const b = board.getBoundingClientRect();
    const nodes: GraphNode[] = [];
    for (let i = 0; i < NODES.length; i++) {
      const el = nodeRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      nodes.push({ id: NODES[i].id, x: Math.round(r.left - b.left), y: Math.round(r.top - b.top) });
    }
    const links: GraphLink[] = [];
    for (let j = 1; j < nodes.length; j++) links.push({ from: nodes[j - 1].id, to: nodes[j].id });
    setJson(JSON.stringify({ nodes: nodes, links: links }, null, 2));
  }, []);

  function say(text: string) {
    setToast(text);
    setShown(true);
    setTimeout(() => setShown(false), 1600);
  }
  function onCopy() {
    setDemo(false);
    const count = json.split("\n").length;   // 몇 줄인지는 글자를 직접 세어 말한다
    const job = navigator.clipboard ? navigator.clipboard.writeText(json) : Promise.reject();
    job.then(
      () => say(DONE.replace("N", String(count))),
      () => {
        say(FAIL);
        const node = codeRef.current;
        if (!node) return;
        const range = document.createRange();
        range.selectNodeContents(node);
        const sel = window.getSelection();
        if (!sel) return;
        sel.removeAllRanges();
        sel.addRange(range);
      }
    );
  }

  const lines = json ? json.split("\n") : [];

  return (
    <main className={styles.stage}>
      <div className={demo ? styles.ng + " " + styles.isDemo : styles.ng} style={rootStyle}>
        <div className={styles.board} ref={(el: any) => { boardRef.current = el; }}>
          <span className={styles.chip}>그래프</span>
          <svg className={styles.wires} viewBox="0 0 152 196" preserveAspectRatio="none" aria-hidden="true">
            {WIRES.map((d) => (
              <path key={d} className={styles.wire} d={d} />
            ))}
          </svg>
          {NODES.map((n, i) => (
            <div
              key={n.id}
              ref={(el: any) => { nodeRefs.current[i] = el; }}
              className={styles.node}
              style={{ left: n.left, top: n.top }}
            >
              {n.inPort ? <span className={styles.port + " " + styles.portIn} aria-hidden="true" /> : null}
              <span className={styles.name}>{n.name}</span>
              {n.outPort ? <span className={styles.port + " " + styles.portOut} aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
        <div className={styles.panel}>
          <div className={styles.head}>
            <span className={styles.brace} aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico}><path d="M240,128c-64,0,0,88-64,88H80c-64,0,0-88-64-88,64,0,0-88,64-88h96C240,40,176,128,240,128Z" opacity="0.2"/><path d="M43.18,128a29.78,29.78,0,0,1,8,10.26c4.8,9.9,4.8,22,4.8,33.74,0,24.31,1,36,24,36a8,8,0,0,1,0,16c-17.48,0-29.32-6.14-35.2-18.26-4.8-9.9-4.8-22-4.8-33.74,0-24.31-1-36-24-36a8,8,0,0,1,0-16c23,0,24-11.69,24-36,0-11.72,0-23.84,4.8-33.74C50.68,38.14,62.52,32,80,32a8,8,0,0,1,0,16C57,48,56,59.69,56,84c0,11.72,0,23.84-4.8,33.74A29.78,29.78,0,0,1,43.18,128ZM240,120c-23,0-24-11.69-24-36,0-11.72,0-23.84-4.8-33.74C205.32,38.14,193.48,32,176,32a8,8,0,0,0,0,16c23,0,24,11.69,24,36,0,11.72,0,23.84,4.8,33.74a29.78,29.78,0,0,0,8,10.26,29.78,29.78,0,0,0-8,10.26c-4.8,9.9-4.8,22-4.8,33.74,0,24.31-1,36-24,36a8,8,0,0,0,0,16c17.48,0,29.32-6.14,35.2-18.26,4.8-9.9,4.8-22,4.8-33.74,0-24.31,1-36,24-36a8,8,0,0,0,0-16Z"/></svg>
            </span>
            <span className={styles.file}>graph.json</span>
            <button type="button" className={styles.copy} aria-label="JSON 복사" onClick={onCopy}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M216,40V168H168V88H88V40Z" opacity="0.2"/><path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"/></svg>
            </button>
          </div>
          <pre className={styles.code} ref={(el: any) => { codeRef.current = el; }}>
            {lines.map((row, i) => (
              <span key={String(i) + row} className={styles.line}>{row}</span>
            ))}
          </pre>
        </div>
        <p className={shown ? styles.toast + " " + styles.isOn : styles.toast} aria-live="polite">
          <span className={styles.tick} aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico}><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"/><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/></svg>
          </span>
          <span className={styles.toastText}>{toast}</span>
        </p>
      </div>
    </main>
  );
}
