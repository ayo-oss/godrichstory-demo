// EditorThemeSwitcher — vanilla 판(run/299/demo/09-editor-theme-switcher/index.html) 의 React 포트.
// 단추를 누르면 패널의 data-theme 하나만 바뀐다 — 색 뭉치는 CSS 변수 선택자가 갈아 끼우므로
// 테마 토큰(--ed-bg·--ed-fg·--tok-key·--tok-str·--tok-num·--tok-com)은 props 가 아니라 CSS 가 정한다.
// 이름표 세 장은 한 칸에 겹쳐 두고 data-cur 로 보이는 것만 고른다 — textContent 를 갈아 끼우지 않는다.
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./EditorThemeSwitcher.module.scss";

export type EditorThemeSwitcherProps = {
  duration?: number;
  easing?: string;
  color?: string;
  initialTheme?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const FILE_NAME = "theme.scss";
const GROUP_LABEL = "테마 선택";
const THEMES = [
  { set: "light", label: "라이트" },
  { set: "dark", label: "다크" },
  { set: "hc", label: "고대비" },
];

export default function EditorThemeSwitcher(props: EditorThemeSwitcherProps) {
  const duration = props.duration ?? 2000;
  const easing = props.easing ?? "cubic-bezier(.2, 1.4, .4, 1)";
  const color = props.color ?? "#ffd23f";
  const [theme, setTheme] = useState<string>(props.initialTheme ?? "light");
  const [preview, setPreview] = useState<boolean>(true);

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div
        className={styles.root + (preview ? " " + styles.isDemo : "")}
        style={vars}
        onPointerDown={() => setPreview(false)}
      >
        <div className={styles.panel} data-theme={theme}>
          <div className={styles.bar}>
            <span className={styles.ico} aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256">
                <g fill="currentColor">
                  <path d="M224 127.17a96.5 96.5 0 0 1-2.39 22.18a24 24 0 0 1-23.4 18.65H152a24 24 0 0 0-24 24a24 24 0 0 1-32 22.61c-37.27-13.17-64-44.8-64-86.61a96 96 0 0 1 95-96c52.84-.53 96.55 42.35 97 95.17" opacity=".2" />
                  <path d="M200.77 53.89A103.27 103.27 0 0 0 128 24h-1.07A104 104 0 0 0 24 128c0 43 26.58 79.06 69.36 94.17A32 32 0 0 0 136 192a16 16 0 0 1 16-16h46.21a31.81 31.81 0 0 0 31.2-24.88a104.4 104.4 0 0 0 2.59-24a103.28 103.28 0 0 0-31.23-73.23m13 93.71a15.89 15.89 0 0 1-15.56 12.4H152a32 32 0 0 0-32 32a16 16 0 0 1-21.31 15.07C62.49 194.3 40 164 40 128a88 88 0 0 1 87.09-88h.9a88.35 88.35 0 0 1 88 87.25a89 89 0 0 1-2.18 20.35ZM140 76a12 12 0 1 1-12-12a12 12 0 0 1 12 12m-44 24a12 12 0 1 1-12-12a12 12 0 0 1 12 12m0 56a12 12 0 1 1-12-12a12 12 0 0 1 12 12m88-56a12 12 0 1 1-12-12a12 12 0 0 1 12 12" />
                </g>
              </svg>
            </span>
            <span className={styles.name}>{FILE_NAME}</span>
            <span className={styles.cur} data-cur={theme}>
              {THEMES.map((t) => (
                <span className={styles.curName} data-set={t.set} key={t.set}>
                  {t.label}
                </span>
              ))}
            </span>
          </div>
          <pre className={styles.code}>
            <span className={styles["t--com"]}>/* theme tokens */</span>{"\n"}
            <span className={styles["t--k"]}>.card</span>{" {\n  --brand: "}
            <span className={styles["t--s"]}>&quot;godrich&quot;</span>{";\n  box-shadow: "}
            <span className={styles["t--n"]}>0 2px 12px</span>{";\n  transition: opacity "}
            <span className={styles["t--n"]}>220ms</span>{";\n}"}
          </pre>
        </div>
        <div className={styles.opts} role="group" aria-label={GROUP_LABEL}>
          {THEMES.map((t) => (
            <button
              className={styles.opt}
              type="button"
              data-set={t.set}
              aria-pressed={theme === t.set}
              key={t.set}
              onClick={() => {
                setPreview(false);
                setTheme(t.set);
              }}
            >
              <span className={styles.ind} aria-hidden="true" />
              <span className={styles.dots} aria-hidden="true">
                <i className={styles.dot + " " + styles["dot--1"]} />
                <i className={styles.dot + " " + styles["dot--2"]} />
                <i className={styles.dot + " " + styles["dot--3"]} />
              </span>
              <span className={styles.lb}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
