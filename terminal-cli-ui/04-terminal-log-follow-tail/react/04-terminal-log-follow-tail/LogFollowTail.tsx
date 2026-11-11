// LogFollowTail — vanilla 판(run/294/demo/04-terminal-log-follow-tail/index.html) 의 React 포트.
// 새 줄이 붙을 때마다 scrollTop 을 바닥으로 밀어 마지막 줄을 계속 따라간다.
// 따라가기가 꺼져 있으면 읽던 자리에 그대로 선다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LogFollowTail.module.scss";

export type LogFollowTailProps = {
  /** 격자 미리보기용 2초 루프. 창을 건드리면 꺼지고 실제 스트림으로 넘어간다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
/** 스크롤 위치만 쓰므로 ref 상자도 쓰는 필드만 지역 타입으로 선언한다 */
type ScrollBox = { scrollTop: number; scrollHeight: number };

type Feed = { tag: string; text: string; kind: string };
type Row = { id: number; tag: string; text: string; kind: string; fresh: boolean; ghost: boolean };

const FEED: Feed[] = [
  { tag: "INFO", text: "GET /api/orders 200 18ms", kind: "" },
  { tag: "INFO", text: "worker picked job 4821", kind: "" },
  { tag: "WARN", text: "retrying upload 2 of 3", kind: "warn" },
  { tag: "INFO", text: "cache warm 1.2k keys", kind: "" },
  { tag: "ERR", text: "POST /pay 502 upstream", kind: "err" },
  { tag: "INFO", text: "deploy 7f21c3 live", kind: "" },
];
const TICK = 700;
const MAX_ROWS = 40;

/** 미리보기는 줄 묶음을 두 벌 깔고 트랙을 translateY(-50%) 로 흘린다 — 두 벌이 이어 붙어야 한 바퀴가 매끄럽다 */
function seedRows(): Row[] {
  const out: Row[] = [];
  for (let copy = 0; copy < 2; copy += 1) {
    for (let i = 0; i < FEED.length; i += 1) {
      const item = FEED[i];
      out.push({ id: -(copy * FEED.length + i) - 1, tag: item.tag, text: item.text, kind: item.kind, fresh: false, ghost: copy === 1 });
    }
  }
  return out;
}

export default function LogFollowTail({
  demo = true,
  duration = 220,
  easing = "ease-out",
  color = "#2b9d74",
}: LogFollowTailProps) {
  const [live, setLive] = useState(demo);
  const [running, setRunning] = useState(false);
  const [follow, setFollow] = useState(true);
  const [rows, setRows] = useState<Row[]>(seedRows);
  const boxRef = useRef<ScrollBox>(null);
  const followRef = useRef<boolean>(true);
  const atRef = useRef<number>(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function start() {
    if (running) { return; }
    setLive(false);
    // 미리보기용 두 번째 벌은 실제 스트림이 시작되면 걷어낸다
    setRows((prev) => prev.filter((row) => !row.ghost));
    setRunning(true);
  }

  useEffect(() => {
    if (!running) { return; }
    const id = setInterval(() => {
      setRows((prev) => {
        const at = atRef.current === null ? 0 : atRef.current;
        atRef.current = at + 1;
        const item = FEED[at % FEED.length];
        const next = prev.concat([{ id: at, tag: item.tag, text: item.text, kind: item.kind, fresh: true, ghost: false }]);
        while (next.length > MAX_ROWS) { next.shift(); }
        return next;
      });
    }, TICK);
    return () => { clearInterval(id); };
  }, [running]);

  // 따라가기가 켜져 있을 때만 바닥으로 민다
  useEffect(() => {
    const box = boxRef.current;
    if (!box || !followRef.current) { return; }
    box.scrollTop = box.scrollHeight;
  }, [rows]);

  function toggleFollow() {
    start();
    const on = !follow;
    followRef.current = on;
    setFollow(on);
    const box = boxRef.current;
    if (on && box) { box.scrollTop = box.scrollHeight; }
  }

  return (
    <main className={styles.stage} style={vars}>
      <div className={live ? `${styles.lg} ${styles.isDemo}` : styles.lg}>
        <p className={styles.bar}>
          <span className={styles.ico} aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
              <g fill="currentColor">
                <path d="M224 56v144a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V56a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8" opacity=".2" />
                <path d="M128 128a8 8 0 0 1-3 6.25l-40 32a8 8 0 1 1-10-12.5L107.19 128L75 102.25a8 8 0 1 1 10-12.5l40 32a8 8 0 0 1 3 6.25m48 24h-40a8 8 0 0 0 0 16h40a8 8 0 0 0 0-16m56-96v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16m-16 144V56H40v144z" />
              </g>
            </svg>
          </span>
          <span className={styles.name}>배포 로그</span>
          <button className={styles.follow} type="button" aria-pressed={follow ? "true" : "false"} onClick={toggleFollow}>따라가기</button>
        </p>
        <div
          className={styles.box}
          ref={boxRef}
          role="log"
          aria-live="polite"
          tabIndex={0}
          aria-label="배포 로그 줄"
          onPointerDown={start}
          onFocus={start}
        >
          <div className={styles.track}>
            {rows.map((row) => {
              const cls = [
                styles.row,
                row.kind === "warn" ? styles.rowWarn : "",
                row.kind === "err" ? styles.rowErr : "",
                row.fresh ? styles.isNew : "",
              ].filter(Boolean).join(" ");
              return (
                <p className={cls} key={row.id} aria-hidden={row.ghost ? "true" : undefined}>
                  <span className={styles.tag}>{row.tag}</span>{row.text}
                </p>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
