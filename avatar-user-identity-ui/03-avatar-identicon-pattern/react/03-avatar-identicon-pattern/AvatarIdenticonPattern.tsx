import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./AvatarIdenticonPattern.module.scss";

export type AvatarIdenticonPatternProps = {
  label?: string;
  nameLabel?: string;
  placeholder?: string;
  name?: string;
  smallNames?: string[];
  /** 칸 숨쉬기 한 바퀴(ms) — 2초의 약수 */
  duration?: number;
  easing?: string;
  /** 오렌지 무대 글자색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type CellVars = CSSProperties & { "--i"?: string };
// ambient 타입에 React 이벤트 제네릭이 없어 로컬 타입을 쓴다
type InputEvt = { target: { value: string } };

// FNV-1a 32비트 — 같은 이름은 늘 같은 정수를 돌려준다
function hash32(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h = (h ^ text.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// 비트 15개를 열 0·1·2 에 놓고 열 0↔4 · 1↔3 을 거울처럼 맞춰 25칸을 채운다
function cellsOf(text: string): number[] {
  const h = hash32(text);
  const cells: number[] = [];
  for (let row = 0; row < 5; row++) {
    const left = [(h >>> (row * 3)) & 1, (h >>> (row * 3 + 1)) & 1, (h >>> (row * 3 + 2)) & 1];
    cells.push(left[0], left[1], left[2], left[1], left[0]);
  }
  return cells;
}

function IdenticonGrid({ className, name }: { className: string; name: string }): ReactNode {
  // 켜진 칸만 색이 들어간다 — 색도 해시로 고른 data-tone 번호가 정한다(scss 가 칠한다)
  return (
    <div className={className} data-tone={String(hash32(name) % 6)} aria-hidden="true">
      {cellsOf(name).map((on, i) => (
        <span
          key={i}
          className={on ? `${styles.cell} ${styles.cellOn}` : styles.cell}
          style={{ "--i": String(i) } as CellVars}
        />
      ))}
    </div>
  );
}

export default function AvatarIdenticonPattern({
  label = "이름 무늬 아바타",
  nameLabel = "이름",
  placeholder = "이름을 입력하세요",
  name = "관리자",
  smallNames = ["디자이너", "기획자", "운영자"],
  duration = 1000,
  easing = "ease-out",
  color = "#17141a",
}: AvatarIdenticonPatternProps): ReactNode {
  const [value, setValue] = useState<string>(name);
  const [loop, setLoop] = useState<boolean>(true);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section
      className={loop ? `${styles.id} ${styles.isDemo}` : styles.id}
      style={vars}
      aria-label={label}
      onPointerDown={() => setLoop(false)}
      onFocus={() => setLoop(false)}
    >
      <div className={styles.field}>
        <label className={styles.label} htmlFor="id-name">{nameLabel}</label>
        <input
          className={styles.input}
          id="id-name"
          type="text"
          value={value}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          onChange={(e: InputEvt) => setValue(e.target.value)}
        />
      </div>

      {/* 입력이 바뀌면 그 자리에서 다시 그린다 */}
      <IdenticonGrid className={styles.grid} name={value} />

      <ul className={styles.list}>
        {smallNames.map((smallName) => (
          <li key={smallName} className={styles.item}>
            <IdenticonGrid className={styles.mini} name={smallName} />
            <span className={styles.smallName}>{smallName}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
