// ShortcutHintTooltip — vanilla 판(run/288/demo/03-shortcut-hint-tooltip/index.html) 의 React 포트.
// 버튼마다 aria-keyshortcuts 를 달아 두고, 같은 조합을 실제로 누르면 그 버튼이 한 번 눌린다.
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ShortcutHintTooltip.module.scss";

export type ShortcutHintTooltipProps = {
  /** 격자 미리보기용 2초 자동 루프. 마우스를 올리거나 초점이 들어오면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

type Tool = { combo: string; label: string; shortcut: string; cap: string };

const TOOLS: Tool[] = [
  { combo: "s", label: "저장", shortcut: "Control+S", cap: "S" },
  { combo: "f", label: "찾기", shortcut: "Control+F", cap: "F" },
  { combo: "enter", label: "실행", shortcut: "Control+Enter", cap: "" },
];

export default function ShortcutHintTooltip({
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: ShortcutHintTooltipProps) {
  const [live, setLive] = useState(demo);
  const [hit, setHit] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    let timer = 0;
    function handleDown(e: KeyboardEvent) {
      if (!e.ctrlKey && !e.metaKey) {
        return;
      }
      const want = e.key === "Enter" ? "enter" : e.key.toLowerCase();
      if (!TOOLS.some((tool) => tool.combo === want)) {
        return;
      }
      e.preventDefault();
      setLive(false);
      setHit(want);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setHit(""), 240);
    }
    window.addEventListener("keydown", handleDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleDown);
    };
  }, []);

  const cls = [styles.root, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="enter" viewBox="0 0 256 256" fill="currentColor">
            <path d="M96,128v96L48,176Z" opacity="0.2" />
            <path d="M192,24a8,8,0,0,0-8,8V168H104V128a8,8,0,0,0-13.66-5.66l-48,48a8,8,0,0,0,0,11.32l48,48A8,8,0,0,0,104,224V184h88a8,8,0,0,0,8-8V32A8,8,0,0,0,192,24ZM88,204.69,59.31,176,88,147.31Z" />
          </symbol>
        </defs>
      </svg>
      <div className={cls}>
        <p className={styles.cap}>버튼에 마우스를 올려 보세요</p>
        <div className={styles.bar} role="toolbar" aria-label="편집 도구">
          {TOOLS.map((tool) => (
            <button
              type="button"
              key={tool.combo}
              className={[styles.btn, hit === tool.combo ? styles.isHit : ""].filter(Boolean).join(" ")}
              aria-keyshortcuts={tool.shortcut}
              onPointerEnter={() => setLive(false)}
              onFocus={() => setLive(false)}
            >
              <span className={styles.label}>{tool.label}</span>
              <span className={styles.tip} role="tooltip">
                <kbd className={styles.cap1}>Ctrl</kbd>
                <kbd className={styles.cap1}>
                  {tool.cap === "" ? <svg className={styles.ico} aria-hidden="true"><use href="#enter" /></svg> : tool.cap}
                </kbd>
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
