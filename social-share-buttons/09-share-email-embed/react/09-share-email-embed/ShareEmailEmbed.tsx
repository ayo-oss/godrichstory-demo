import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ShareEmailEmbed.module.scss";

/* ambient 에 React 의 이벤트 제네릭이 없어 필요한 것만 로컬로 선언한다 */
type KeyEvt = { key: string; preventDefault(): void };
type InputEl = { value: string; select(): void };

export type ShareEmailEmbedProps = {
  /** 공유할 주소와 심을 코드 */
  url?: string;
  embedCode?: string;
  /** 두 탭을 오가는 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 밑줄과 강조 색 */
  color?: string;
  autoPlay?: boolean;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--n"?: number;
};

const TABS = ["메일", "퍼가기"];

export default function ShareEmailEmbed({
  url = "https://example.com/posts/share-ui",
  embedCode = '<iframe src="https://example.com/embed"></iframe>',
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#0f5f8a",
  autoPlay = true,
}: ShareEmailEmbedProps) {
  const [demo, setDemo] = useState(autoPlay);
  const [at, setAt] = useState(0);
  const codeRef = useRef<InputEl>(null) as { current: InputEl | null };

  /* 사람이 손을 대면 자동 재생을 끈다 */
  function stopDemo() {
    setDemo(false);
  }

  /* 밑줄은 짐작한 px 이 아니라 칸 번호 하나로만 움직인다 */
  function applyMove(i: number) {
    stopDemo();
    setAt((i + TABS.length) % TABS.length);
  }

  function applyKey(e: KeyEvt) {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    applyMove(at + d);
  }

  function applyCopy() {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(embedCode);
    else if (codeRef.current) codeRef.current.select();
  }

  const vars: Vars = {
    "--duration": duration + "ms",
    "--easing": easing,
    "--color": color,
    "--n": at,
  };
  const mailHref =
    "mailto:?subject=" + encodeURIComponent("공유합니다") + "&body=" + encodeURIComponent(url);

  return (
    <div className={styles.stage + (demo ? " " + styles.isDemo : "")} style={vars}>
      <section className={styles.embed} aria-label="메일과 퍼가기로 공유" style={vars}>
        <div className={styles.tabs} role="tablist" aria-label="공유 방법" onKeyDown={applyKey}>
          {TABS.map((name, i) => (
            <button
              key={name}
              className={styles.tab + (at === i ? " " + styles.isOn : "")}
              type="button"
              role="tab"
              id={"ee-t" + i}
              aria-controls={"ee-p" + i}
              aria-selected={at === i}
              tabIndex={at === i ? 0 : -1}
              onClick={() => applyMove(i)}
              onPointerDown={stopDemo}
            >
              {name}
            </button>
          ))}
          <span className={styles.line} aria-hidden="true" />
        </div>

        <div className={styles.panels}>
          <div
            className={styles.panel + " " + styles.panelMail}
            role="tabpanel"
            id="ee-p0"
            aria-labelledby="ee-t0"
            hidden={at !== 0}
          >
            <p className={styles.label}>받는 사람에게 갈 편지</p>
            <a className={styles.mail} href={mailHref}>
              <span className={styles.mailIc}><svg width="18" height="18" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M223.69,42.18l-58.22,192a8,8,0,0,1-14.92,1.25L108,148,20.58,105.45a8,8,0,0,1,1.25-14.92l192-58.22A8,8,0,0,1,223.69,42.18Z" opacity="0.2"/><path d="M227.32,28.68a16,16,0,0,0-15.66-4.08l-.15,0L19.57,82.84a16,16,0,0,0-2.49,29.8L102,154l41.3,84.87A15.86,15.86,0,0,0,157.74,248q.69,0,1.38-.06a15.88,15.88,0,0,0,14-11.51l58.2-191.94c0-.05,0-.1,0-.15A16,16,0,0,0,227.32,28.68ZM157.83,231.85l-.05.14,0-.07-40.06-82.3,48-48a8,8,0,0,0-11.31-11.31l-48,48L24.08,98.25l-.07,0,.14,0L216,40Z"/></svg></span>
              <span className={styles.mailName}>메일 앱으로 열기</span>
            </a>
          </div>

          <div
            className={styles.panel + " " + styles.panelEmbed}
            role="tabpanel"
            id="ee-p1"
            aria-labelledby="ee-t1"
            hidden={at !== 1}
          >
            <p className={styles.label}>그대로 붙이는 코드</p>
            <div className={styles.field}>
              <input
                className={styles.code}
                type="text"
                defaultValue={embedCode}
                readOnly
                aria-label="붙여 넣을 코드"
                ref={codeRef as unknown as never}
              />
              <button className={styles.copy} type="button" aria-label="코드 복사" onClick={applyCopy}>
                <svg width="16" height="16" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M216,40V168H168V88H88V40Z" opacity="0.2"/><path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"/></svg>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
