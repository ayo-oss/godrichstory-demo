// KeycapStyles — vanilla 판(run/288/demo/01-kbd-keycap-styles/index.html) 의 React 포트.
// 평면·입체·테두리 세 키캡. 실제 키 입력에 반응해 해당 키캡만 translateY 로 내려앉았다가 keyup 에 돌아온다.
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./KeycapStyles.module.scss";

export type KeycapStylesProps = {
  /** 격자 미리보기용 2초 자동 루프. 사람이 키를 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

type Cap = { key: string; label: string; tag: string; face: string };

/** vanilla 의 data-key 세 개와 같은 순서 */
const CAPS: Cap[] = [
  { key: "a", label: "A", tag: "평면", face: "capFlat" },
  { key: "s", label: "S", tag: "입체", face: "capRaised" },
  { key: "d", label: "D", tag: "테두리", face: "capOutline" },
];

export default function KeycapStyles({
  demo = true,
  duration = 140,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ffd23f",
}: KeycapStylesProps) {
  const [live, setLive] = useState(demo);
  const [down, setDown] = useState("");
  const [readText, setReadText] = useState("-");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    function handleDown(e: KeyboardEvent) {
      const want = e.key.toLowerCase();
      if (!CAPS.some((cap) => cap.key === want)) {
        return;
      }
      setLive(false);
      setDown(want);
      setReadText(want.toUpperCase());
    }
    function handleUp(e: KeyboardEvent) {
      const want = e.key.toLowerCase();
      if (CAPS.some((cap) => cap.key === want)) {
        setDown("");
      }
    }
    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
  }, []);

  const cls = [styles.root, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="keyboard" viewBox="0 0 256 256" fill="currentColor">
            <path d="M232,64V192a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V64a8,8,0,0,1,8-8H224A8,8,0,0,1,232,64Z" opacity="0.2" />
            <path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,144H32V64H224V192Zm-16-64a8,8,0,0,1-8,8H56a8,8,0,0,1,0-16H200A8,8,0,0,1,208,128Zm0-32a8,8,0,0,1-8,8H56a8,8,0,0,1,0-16H200A8,8,0,0,1,208,96ZM72,160a8,8,0,0,1-8,8H56a8,8,0,0,1,0-16h8A8,8,0,0,1,72,160Zm96,0a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,160Zm40,0a8,8,0,0,1-8,8h-8a8,8,0,0,1,0-16h8A8,8,0,0,1,208,160Z" />
          </symbol>
        </defs>
      </svg>
      <div className={cls}>
        <p className={styles.hint}>
          <svg className={styles.ico} aria-hidden="true"><use href="#keyboard" /></svg>
          <span>A · S · D 를 눌러 보세요</span>
        </p>
        <div className={styles.row}>
          {CAPS.map((cap) => (
            <span className={styles.cell} key={cap.key}>
              <kbd className={[styles.cap, styles[cap.face], down === cap.key ? styles.isDown : ""].filter(Boolean).join(" ")}>
                {cap.label}
              </kbd>
              <span className={styles.tag}>{cap.tag}</span>
            </span>
          ))}
        </div>
        <p className={styles.read}>
          <span className={styles.readLabel}>누른 키</span>
          <b className={styles.readKey}>
            <span className={styles.readText} aria-live="polite">{readText}</span>
            <span className={styles.loop} aria-hidden="true"><i>A</i><i>S</i><i>D</i></span>
          </b>
        </p>
      </div>
    </main>
  );
}
