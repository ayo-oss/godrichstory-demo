import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ShortcutOverlay.module.scss";

export type ShortcutOverlayProps = {
  /** 더미 영상 길이(초) */
  total?: number;
  /** 시작 위치(초) */
  start?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

// TS7006 방지 — 'react' 의 이벤트 제네릭 대신 필요한 필드만 로컬로 선언한다
type Hit = { id: string; n: number };

type Row = { keys: { id: string; label: string }[]; what: string };

const ROWS: Row[] = [
  { keys: [{ id: "space", label: "Space" }], what: "재생·정지" },
  { keys: [{ id: "left", label: "←" }, { id: "right", label: "→" }], what: "5초 이동" },
  { keys: [{ id: "m", label: "M" }], what: "음소거" },
  { keys: [{ id: "f", label: "F" }], what: "전체화면" },
];

function fmt(s: number) {
  const n = Math.floor(s);
  return Math.floor(n / 60) + ":" + ("0" + (n % 60)).slice(-2);
}

function QuestionIcon() {
  return (
    <svg viewBox="0 0 256 256" width="17" height="17" aria-hidden="true">
      <g fill="currentColor">
        <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
        <path d="M140 180a12 12 0 1 1-12-12a12 12 0 0 1 12 12M128 72c-22.06 0-40 16.15-40 36v4a8 8 0 0 0 16 0v-4c0-11 10.77-20 24-20s24 9 24 20s-10.77 20-24 20a8 8 0 0 0-8 8v8a8 8 0 0 0 16 0v-.72c18.24-3.35 32-17.9 32-35.28c0-19.85-17.94-36-40-36m104 56A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" />
      </g>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 256 256" width="13" height="13" aria-hidden="true">
      <g fill="currentColor">
        <path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" />
        <path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" />
      </g>
    </svg>
  );
}

export default function ShortcutOverlay({
  total = 180,
  start = 12,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: ShortcutOverlayProps) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [mute, setMute] = useState(false);
  const [full, setFull] = useState(false);
  const [t, setT] = useState(start);
  const [hit, setHit] = useState<Hit>({ id: "", n: 0 });
  const qbRef = useRef<HTMLButtonElement>(null);
  const xRef = useRef<HTMLButtonElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 더미 재생 시계 — Space 로 멈추면 같이 멈춘다 (바닐라의 setInterval(250ms))
  useEffect(() => {
    if (!playing) return;
    let last = Date.now();
    const id = setInterval(() => {
      const n = Date.now();
      const step = (n - last) / 1000;
      last = n;
      setT((p) => (p + step) % total);
    }, 250);
    return () => clearInterval(id);
  }, [playing, total]);

  // 열리면 닫기 버튼으로 초점을 옮긴다 (되돌리는 건 close 에서)
  useEffect(() => {
    if (open) xRef.current?.focus({ preventScroll: true });
  }, [open]);

  // 단축키는 오버레이가 닫혀 있어도 그 자리에서 먹는다. Escape 는 오버레이만 닫는다
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (open) close();
        return;
      }
      const k =
        e.key === " " ? "space"
        : e.key === "ArrowLeft" ? "left"
        : e.key === "ArrowRight" ? "right"
        : (e.key || "").toLowerCase() === "m" ? "m"
        : (e.key || "").toLowerCase() === "f" ? "f"
        : "";
      if (!k) return;
      e.preventDefault();
      if (k === "space") setPlaying((v) => !v);
      if (k === "left") setT((v) => Math.max(0, v - 5));
      if (k === "right") setT((v) => Math.min(total, v + 5));
      if (k === "m") setMute((v) => !v);
      if (k === "f") setFull((v) => !v);
      setHit((h) => ({ id: k, n: h.n + 1 }));
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, total]);

  function close() {
    setOpen(false);
    qbRef.current?.focus({ preventScroll: true });
  }

  const cls = [
    styles.player,
    open ? styles.isOpen : "",
    playing ? "" : styles.isPaused,
    mute ? styles.isMute : "",
    full ? styles.isFull : "",
  ].join(" ");

  return (
    <figure className={cls} style={vars}>
      <div className={styles.screen}>
        <div className={styles.stripes} aria-hidden="true" />
        <div className={styles.world} aria-hidden="true">
          <span className={styles.sun} />
          <span className={`${styles.hill} ${styles.hillA}`} />
          <span className={`${styles.hill} ${styles.hillB}`} />
        </div>
        <span className={styles.clock}>{fmt(t)}</span>
        <span className={styles.badge}>{fmt(total)}</span>
        <span className={styles.mute} aria-hidden="true">음소거</span>

        <div className={styles.bar}>
          <span className={styles.time}>
            <b>{fmt(t)}</b> / {fmt(total)}
          </span>
          <button
            ref={qbRef}
            className={styles.qb}
            type="button"
            aria-label="단축키 안내"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <QuestionIcon />
          </button>
        </div>

        <span className={styles.fillwrap} aria-hidden="true">
          <span className={styles.fill} style={{ transform: `scaleX(${(t / total).toFixed(4)})` }} />
        </span>

        <div className={styles.ovl} role="dialog" aria-modal="true" aria-label="키보드 단축키 안내">
          <div className={styles.panel}>
            <div className={styles.head}>
              <p className={styles.title}>단축키</p>
              <button ref={xRef} className={styles.x} type="button" aria-label="닫기" onClick={close}>
                <CloseIcon />
              </button>
            </div>
            <ul className={styles.list}>
              {ROWS.map((r) => (
                <li key={r.what} className={styles.row}>
                  <span className={styles.keys}>
                    {r.keys.map((k) => (
                      // key 를 바꿔 다시 마운트시켜야 눌림 애니메이션이 매번 처음부터 돈다
                      <kbd
                        key={k.id + "-" + (hit.id === k.id ? hit.n : 0)}
                        className={`${styles.kbd} ${hit.id === k.id ? styles.isHit : ""}`}
                      >
                        {k.label}
                      </kbd>
                    ))}
                  </span>
                  <span className={styles.what}>{r.what}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </figure>
  );
}
