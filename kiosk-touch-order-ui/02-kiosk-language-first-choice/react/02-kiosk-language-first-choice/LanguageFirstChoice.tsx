// LanguageFirstChoice — vanilla 판(run/298/demo/02-kiosk-language-first-choice/index.html) 의 React 포트.
// 언어 고르기 첫 화면. 고른 칸만 aria-pressed="true" 가 되고, 아래 안내 한 줄이 **고른 언어로** 바뀐다.
// 미리보기 루프(.isDemo)는 CSS 키프레임이 돌린다. 손이 닿는 순간 루프를 떼고 진짜 선택으로 넘긴다.
// <button> 은 Enter·Space 를 브라우저가 click 으로 바꿔 준다 — 키 핸들러를 따로 두지 않는다.
// 값·수치는 vanilla 와 같다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LanguageFirstChoice.module.scss";

export type LanguageFirstChoiceProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};
type Lang = { code: string; name: string; cell: string };

// _의도적한국어: 언어 이름은 그 언어 표기가 정석이라 번역하지 않는다.
// 문구 사전이 걷어 가지 않도록 data-name 에 두고 CSS content 로 그린다.
const LANGS: Lang[] = [
  { code: "ko", name: "한국어", cell: "cell1" },
  { code: "en", name: "English", cell: "cell2" },
  { code: "ja", name: "日本語", cell: "cell3" },
  { code: "vi", name: "Tiếng Việt", cell: "cell4" },
];

// 안내문 한 벌을 상수로 둔다 — 화면 언어가 바뀌는 것을 보여 주는 게 이 데모의 주제라서,
// ko 말고 en·ja·vi 문장은 번역 대상이 아니라 그 자체가 데모 데이터다.
const LANG_HINT: { [k: string]: string } = {
  ko: "한국어로 주문 화면이 열립니다",
  en: "The order screen opens in English",
  ja: "日本語で注文画面が開きます",
  vi: "Màn hình đặt món sẽ mở bằng tiếng Việt",
};

// CSS 모듈은 규칙이 없는 이름을 undefined 로 돌려준다 — vanilla 에서 스타일이 안 붙은 이름
// (첫 칸 .kl__cell--1 은 지연이 없어 규칙이 없다)까지 구조 그대로 옮기려고 빈 값을 걸러 낸다
function cx(...names: (string | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

const HEAD = "언어를 골라 주세요";
const GROUP_LABEL = "화면 언어";
const FIRST_HINT = "고른 언어로 주문 화면이 열립니다";

// 체크 아이콘 넷이 같은 그림이라 한 군데서만 그린다
function CheckMark({ cls }: { cls: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={cls} aria-hidden="true"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"/><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/></svg>
  );
}

export default function LanguageFirstChoice({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: LanguageFirstChoiceProps) {
  const [picked, setPicked] = useState("ko");
  const [hint, setHint] = useState(FIRST_HINT);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function pick(code: string): void {
    setDemo(false);
    setPicked(code);
    const text = LANG_HINT[code];
    if (text) { setHint(text); }
  }

  const cls = cx(styles.root, demo ? styles.isDemo : "");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <p className={styles.head}>{HEAD}</p>
        <div className={styles.grid} role="group" aria-label={GROUP_LABEL}>
          {LANGS.map((lang) => (
            <div key={lang.code} className={cx(styles.cell, styles[lang.cell])}>
              <button
                type="button"
                className={styles.opt}
                data-lang={lang.code}
                aria-pressed={picked === lang.code ? "true" : "false"}
                onClick={() => pick(lang.code)}
              >
                <span className={styles.name} data-name={lang.name}></span>
                <CheckMark cls={styles.check} />
              </button>
            </div>
          ))}
        </div>
        <p className={styles.hint}>{hint}</p>
      </div>
    </main>
  );
}
