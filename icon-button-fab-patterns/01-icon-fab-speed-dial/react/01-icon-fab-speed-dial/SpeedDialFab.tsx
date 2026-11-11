import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SpeedDialFab.module.scss";

export type SpeedDialFabProps = {
  /** 보조 동작 라벨 — 아이콘은 순서대로 글쓰기·사진·녹음 3종이 돌아간다 */
  actions?: string[];
  hintIdle?: string;
  hintOpen?: string;
  hintPicked?: string;
  openLabel?: string;
  closeLabel?: string;
  groupLabel?: string;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 KeyboardEvent 를 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type KeyEvt = { key: string };

const DEFAULT_ACTIONS = ["Write a post", "Upload a photo", "Record a voice note"];

let seq = 0;

function PencilIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor"><path d="M221.66,90.34,192,120,136,64l29.66-29.66a8,8,0,0,1,11.31,0L221.66,79A8,8,0,0,1,221.66,90.34Z" opacity=".2"/><path d="M227.32,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31l83.67-83.66,3.48,13.9-36.8,36.79a8,8,0,0,0,11.31,11.32l40-40a8,8,0,0,0,2.11-7.6l-6.9-27.61L227.32,96A16,16,0,0,0,227.32,73.37ZM48,208V179.31L76.69,208Zm48-3.31L51.31,160,136,75.31,180.69,120Zm96-96L147.32,64l24-24L216,84.69Z"/></svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor"><path d="M224,56V178.06l-39.72-39.72a8,8,0,0,0-11.31,0L147.31,164,97.66,114.34a8,8,0,0,0-11.32,0L32,168.69V56a8,8,0,0,1,8-8H216A8,8,0,0,1,224,56Z" opacity=".2"/><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37V56ZM40,172l52-52,80,80H40Zm176,28H194.63l-36-36,20-20L216,181.38V200ZM144,100a12,12,0,1,1,12,12A12,12,0,0,1,144,100Z"/></svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor"><path d="M168,64v64a40,40,0,0,1-40,40h0a40,40,0,0,1-40-40V64a40,40,0,0,1,40-40h0A40,40,0,0,1,168,64Z" opacity=".2"/><path d="M128,176a48.05,48.05,0,0,0,48-48V64a48,48,0,0,0-96,0v64A48.05,48.05,0,0,0,128,176ZM96,64a32,32,0,0,1,64,0v64a32,32,0,0,1-64,0Zm40,143.6V240a8,8,0,0,1-16,0V207.6A80.11,80.11,0,0,1,48,128a8,8,0,0,1,16,0,64,64,0,0,0,128,0,8,8,0,0,1,16,0A80.11,80.11,0,0,1,136,207.6Z"/></svg>
  );
}

const ICONS = [PencilIcon, ImageIcon, MicIcon];

export default function SpeedDialFab({
  actions = DEFAULT_ACTIONS,
  hintIdle = "What do you want to make?",
  hintOpen = "Pick an action",
  hintPicked = "Coming soon",
  openLabel = "Open create menu",
  closeLabel = "Close create menu",
  groupLabel = "Create tools speed dial",
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: SpeedDialFabProps) {
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(demo);
  const [hint, setHint] = useState(hintIdle);
  const [menuId] = useState<string>(() => "speed-dial-menu-" + String(++seq));

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function toggle() {
    setLive(false);
    const next = !open;
    setOpen(next);
    setHint(next ? hintOpen : hintIdle);
  }

  function pick() {
    // 보조 동작을 고르면 다이얼은 접히고 안내만 바뀐다
    setLive(false);
    setOpen(false);
    setHint(hintPicked);
  }

  function onKeyDown(e: KeyEvt) {
    if (e.key !== "Escape") return;
    setLive(false);
    setOpen(false);
    setHint(hintIdle);
  }

  const cls = [styles.sd, live ? styles.isDemo : "", open ? styles.isOpen : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel} onKeyDown={onKeyDown}>
      <p className={styles.hint}>{hint}</p>
      <ul className={styles.menu} id={menuId}>
        {actions.map((label, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <li className={styles.item} key={label}>
              <button className={styles.sub} type="button" aria-label={label} onClick={pick}>
                <span className={styles.tag}>{label}</span>
                <span className={styles.ic} aria-hidden="true"><Icon /></span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className={styles.dock}>
        <button
          className={styles.fab}
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? closeLabel : openLabel}
          onClick={toggle}
        >
          <span className={styles.plus} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor"><path d="M216,56V200a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V56A16,16,0,0,1,56,40H200A16,16,0,0,1,216,56Z" opacity=".2"/><path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"/></svg>
          </span>
        </button>
      </div>
    </section>
  );
}
