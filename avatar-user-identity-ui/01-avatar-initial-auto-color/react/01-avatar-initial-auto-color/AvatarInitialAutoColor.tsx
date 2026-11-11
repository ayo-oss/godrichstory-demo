import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./AvatarInitialAutoColor.module.scss";

export type AvatarInitialAutoColorProps = {
  label?: string;
  nameLabel?: string;
  placeholder?: string;
  hint?: string;
  name?: string;
  rowNames?: string[];
  /** 아래 줄 아바타가 한 번 솟았다 앉는 주기(ms) */
  duration?: number;
  easing?: string;
  /** 라벨·안내 줄 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 타입에 React 이벤트 제네릭이 없어 로컬 타입을 쓴다
type InputEvt = { target: { value: string } };

// 이름을 숫자로 접어 0~5 — 순수 함수라 같은 이름은 늘 같은 색을 고른다
function hashName(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h % 6;
}

// 한국어면 첫 글자 1자, 라틴이면 앞 두 단어의 머리글자
function initialsOf(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (/[가-힣]/.test(trimmed[0])) return trimmed[0];
  const words = trimmed.split(/\s+/).filter((w) => /[A-Za-z]/.test(w[0] || ""));
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

export default function AvatarInitialAutoColor({
  label = "이니셜 자동 색 아바타",
  nameLabel = "이름",
  placeholder = "이름을 입력하세요",
  hint = "같은 이름은 늘 같은 색입니다",
  name = "관리자",
  rowNames = ["편집자", "디자이너", "번역가", "상담원", "검토자"],
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b6b0c0",
}: AvatarInitialAutoColorProps): ReactNode {
  const [value, setValue] = useState<string>(name);
  const [loop, setLoop] = useState<boolean>(true);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section
      className={loop ? `${styles.ai} ${styles.isDemo}` : styles.ai}
      style={vars}
      aria-label={label}
      onPointerDown={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      <div className={styles.field}>
        <label className={styles.label} htmlFor="ai-name">{nameLabel}</label>
        <input
          className={styles.input}
          id="ai-name"
          type="text"
          value={value}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          onChange={(e: InputEvt) => setValue(e.target.value)}
        />
        {/* 이니셜 글자와 data-tone 은 이름에서 계산해 넣는다 — JS 는 색을 모른다 */}
        <span className={styles.avatar} data-tone={String(hashName(value))} aria-hidden="true">
          {initialsOf(value)}
        </span>
      </div>

      <p className={styles.hint}>{hint}</p>

      <ul className={styles.row}>
        {rowNames.map((rowName) => (
          <li key={rowName} className={styles.item}>
            <span className={styles.dot} data-tone={String(hashName(rowName))} aria-hidden="true">
              {initialsOf(rowName)}
            </span>
            <span className={styles.name}>{rowName}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
