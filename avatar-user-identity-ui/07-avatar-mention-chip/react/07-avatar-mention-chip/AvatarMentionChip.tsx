import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./AvatarMentionChip.module.scss";

export type AvatarMentionChipProps = {
  label?: string;
  /** 목록에 올 사람(직무 명사) */
  people?: string[];
  /** 처음부터 들어가 있는 칩 */
  initialChips?: string[];
  placeholder?: string;
  listLabel?: string;
  removeLabel?: string;
  /** 짚는 막대가 네 줄을 훑고 돌아오는 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** @ 표시·입력 초점 테두리 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type InputEvt = { target: { value: string } };
type KeyEvt = { key: string; preventDefault(): void };

// 이니셜은 표시 문자열에서 계산한다(하드코딩 금지) — 언어팩이 바뀌면 이니셜도 따라간다
function initialOf(name: string): string {
  const p = name.trim().split(/\s+/);
  return /[A-Za-z]/.test(p[0]) ? p.slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("") : p[0].charAt(0);
}

const AtIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="12" height="12" aria-hidden="true" focusable="false" fill="currentColor" className={styles.at}>
    <path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2" />
    <path d="M128,24a104,104,0,0,0,0,208c21.51,0,44.1-6.48,60.43-17.33a8,8,0,0,0-8.86-13.33C166,210.38,146.21,216,128,216a88,88,0,1,1,88-88c0,26.45-10.88,32-20,32s-20-5.55-20-32V88a8,8,0,0,0-16,0v4.26a48,48,0,1,0,5.93,65.1c6,12,16.35,18.64,30.07,18.64,22.54,0,36-17.94,36-48A104.11,104.11,0,0,0,128,24Zm0,136a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z" />
  </svg>
);

const XIcon = (): ReactNode => (
  <svg viewBox="0 0 256 256" width="10" height="10" aria-hidden="true" focusable="false" fill="currentColor">
    <path d="M216,56V200a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V56A16,16,0,0,1,56,40H200A16,16,0,0,1,216,56Z" opacity="0.2" />
    <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
  </svg>
);

export default function AvatarMentionChip({
  label = "멘션 입력 시범",
  people = ["편집자", "디자이너", "개발자", "기획자"],
  initialChips = ["관리자"],
  placeholder = "댓글을 입력하세요",
  listLabel = "멘션할 사람",
  removeLabel = "멘션 지우기",
  duration = 2000,
  easing = "ease-out",
  color = "#2a5fd8",
}: AvatarMentionChipProps): ReactNode {
  const [loop, setLoop] = useState<boolean>(true);
  const [value, setValue] = useState<string>("");
  const [open, setOpen] = useState<boolean>(true);
  const [active, setActive] = useState<number>(0);
  const [chips, setChips] = useState<string[]>(initialChips);

  // @ 를 치면 목록이 열리고, 이어 치는 글자로 이름을 걸러낸다
  const at = value.lastIndexOf("@");
  const visible = at < 0 ? [] : people.filter((n) => n.includes(value.slice(at + 1)));
  const activeName = visible.length ? visible[Math.min(active, visible.length - 1)] : "";

  const toneClasses: Record<string, string> = {
    blue: styles.avBlue,
    violet: styles.avViolet,
    teal: styles.avTeal,
    plum: styles.avPlum,
    slate: styles.avSlate,
  };
  // 아바타 배경은 목록 순서로 붙고, 목록 밖 사람은 슬레이트
  function toneOf(name: string): string {
    const i = people.indexOf(name);
    return i < 0 ? "slate" : ["blue", "violet", "teal", "plum", "slate"][i % 5];
  }

  function move(d: number) {
    if (!visible.length) return;
    setActive((a) => (a + d + visible.length) % visible.length);
  }

  // 고른 사람을 칩으로 입력칸 앞에 넣고 @질의를 지운다
  function pick(name: string) {
    setChips((c) => c.concat(name));
    setValue("");
    setOpen(false);
  }

  function onChange(e: InputEvt) {
    setValue(e.target.value);
    if (e.target.value.lastIndexOf("@") < 0) { setOpen(false); return; }
    setOpen(true);
    setActive(0);
  }

  function onKeyDown(e: KeyEvt) {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") { e.preventDefault(); if (activeName) pick(activeName); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section
      className={loop ? `${styles.mc} ${styles.isDemo}` : styles.mc}
      style={vars}
      aria-label={label}
      onPointerDown={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      <div className={styles.row}>
        {chips.map((name) => (
          <span className={styles.chip} key={name}>
            <span className={`${styles.av} ${toneClasses[toneOf(name)]}`} aria-hidden="true">{initialOf(name)}</span>
            <AtIcon />
            <span className={styles.name}>{name}</span>
            <button
              className={styles.x}
              type="button"
              aria-label={removeLabel}
              onClick={() => setChips((c) => c.filter((n) => n !== name))}
            >
              <XIcon />
            </button>
          </span>
        ))}
        <input
          className={styles.input}
          type="text"
          role="combobox"
          aria-expanded={open ? "true" : "false"}
          aria-controls="mc-list"
          aria-autocomplete="list"
          aria-activedescendant={activeName ? `mc-opt-${people.indexOf(activeName)}` : undefined}
          placeholder={placeholder}
          autoComplete="off"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />

        {/* 절대배치 목록 — 줄(position:relative) 바로 아래에 열리고 뿌리의 padding-bottom 이 자리를 잡는다 */}
        <ul className={styles.list} id="mc-list" role="listbox" aria-label={listLabel} hidden={!open}>
          {visible.map((name) => (
            <li
              key={name}
              id={`mc-opt-${people.indexOf(name)}`}
              role="option"
              aria-selected={name === activeName ? "true" : "false"}
              className={styles.opt}
              onClick={() => pick(name)}
            >
              <span className={`${styles.av} ${toneClasses[toneOf(name)]}`} aria-hidden="true">{initialOf(name)}</span>
              <span className={styles.name}>{name}</span>
            </li>
          ))}
          {/* 짚는 막대 — 격자 미리보기 루프에서만 움직인다 */}
          <li className={styles.bar} aria-hidden="true" />
        </ul>
      </div>
    </section>
  );
}
