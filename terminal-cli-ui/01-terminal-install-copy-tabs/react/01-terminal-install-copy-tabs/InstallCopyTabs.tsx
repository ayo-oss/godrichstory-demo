// InstallCopyTabs — vanilla 판(run/294/demo/01-terminal-install-copy-tabs/index.html) 의 React 포트.
// 같은 패키지를 npm·pnpm·yarn 문법으로 갈아 끼우고 그 줄을 클립보드에 넣는다.
// 탭이나 복사 버튼을 한 번 누르면 격자 미리보기 루프(demo)가 꺼지고 사람이 고른 상태만 남는다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./InstallCopyTabs.module.scss";

export type InstallCopyTabsProps = {
  /** 격자 미리보기용 2초 자동 루프. 탭·복사 버튼을 누르면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
/** React 이벤트 제네릭이 ambient 에 없어 쓰는 필드만 지역 타입으로 선언한다 */
type Box<T> = { current: T };

const MANAGERS = ["npm", "pnpm", "yarn"];
/** 관리자마다 설치 명령의 앞부분만 다르다 — 뒤에 붙는 패키지 이름은 같다 */
const VERBS: { [k: string]: string } = { npm: "npm i", pnpm: "pnpm add", yarn: "yarn add" };
const PACKAGE_NAME = "motionkit";
const NOTE_TEXT = "클립보드에 복사했습니다";

export default function InstallCopyTabs({
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2b9d74",
}: InstallCopyTabsProps) {
  const [live, setLive] = useState(demo);
  const [mgr, setMgr] = useState("npm");
  const [done, setDone] = useState(false);
  const [note, setNote] = useState(NOTE_TEXT);
  const stepTimer = useRef<number>(0) as Box<number>;
  const backTimer = useRef<number>(0) as Box<number>;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    return () => {
      window.clearTimeout(stepTimer.current);
      window.clearTimeout(backTimer.current);
    };
  }, []);

  function pick(next: string) {
    setLive(false);
    setMgr(next);
  }

  function showDone() {
    setDone(true);
    window.clearTimeout(stepTimer.current);
    window.clearTimeout(backTimer.current);
    // 알림을 지웠다가 다시 넣어야 같은 문장이라도 aria-live 가 한 번 더 읽는다
    setNote("");
    stepTimer.current = window.setTimeout(() => {
      setNote(NOTE_TEXT);
      backTimer.current = window.setTimeout(() => { setDone(false); }, 1400);
    }, 60);
  }

  function copy() {
    setLive(false);
    const text = `${VERBS[mgr]} ${PACKAGE_NAME}`;
    const clip = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (clip) { clip.writeText(text).then(showDone, showDone); }
    else { showDone(); }
  }

  const cls = [styles.root, live ? styles.isDemo : "", done ? styles.isDone : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <div className={cls} data-mgr={mgr}>
        <div className={styles.tabs} role="tablist" aria-label="패키지 관리자">
          {MANAGERS.map((name) => (
            <button
              className={styles.tab}
              type="button"
              role="tab"
              key={name}
              data-mgr={name}
              aria-selected={mgr === name}
              onClick={() => pick(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <div className={styles.row}>
          <span className={styles.sign} aria-hidden="true">$</span>
          <span className={styles.slot}>
            {MANAGERS.map((name) => (
              <code className={styles.cmd} key={name} data-mgr={name}>
                {VERBS[name]} <b>{PACKAGE_NAME}</b>
              </code>
            ))}
          </span>
          <button className={styles.copy} type="button" onClick={copy}>
            <span className={styles.ico} aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256"><g fill="currentColor"><path d="M216 40v128h-48V88H88V40Z" opacity=".2" /><path d="M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-56 176H48V96h112Zm48-48h-32V88a8 8 0 0 0-8-8H96V48h112Z" /></g></svg>
            </span>
            <span className={styles.word}>{done ? "복사됨" : "명령 복사"}</span>
          </button>
        </div>
        <p className={styles.note} role="status">{note}</p>
      </div>
    </main>
  );
}
