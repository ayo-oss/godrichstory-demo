// KeycastStream — vanilla 판(run/288/demo/09-kbd-keycast-stream/index.html) 의 React 포트.
// 새 키는 오른쪽에서 들어오고 다섯 개를 넘으면 가장 오래된 것부터 빠진다. 옅어짐은 판의 mask 가 맡는다.
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./KeycastStream.module.scss";

export type KeycastStreamProps = {
  /** 격자 미리보기용 2초 자동 루프. 사람이 키를 누르면 꺼지고 미리보기용 두 번째 벌이 빠진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const MAX = 5;
/** 미리보기에서 보여 주는 다섯 칸 — 흐름이 이어지도록 한 벌을 더 붙인다 */
const SEED = ["Ctrl", "S", "J", "G", "?"];

function labelFor(e: KeyboardEvent): string {
  if (e.key === " ") { return "Space"; }
  return e.key.length === 1 ? e.key.toUpperCase() : e.key;
}

export default function KeycastStream({
  demo = true,
  duration = 300,
  easing = "ease-out",
  color = "#ffd23f",
}: KeycastStreamProps) {
  const [live, setLive] = useState(demo);
  const [keys, setKeys] = useState<string[]>(SEED);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    function handleDown(e: KeyboardEvent) {
      if (e.isComposing) { return; }
      setLive(false);
      const text = labelFor(e);
      setKeys((prev) => prev.concat([text]).slice(-MAX));
    }
    window.addEventListener("keydown", handleDown);
    return () => window.removeEventListener("keydown", handleDown);
  }, []);

  const cls = [styles.root, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage} style={vars}>
      <div className={cls}>
        <p className={styles.cap}>방금 누른 키</p>
        <div className={styles.panel}>
          <div className={styles.strip} aria-live="polite" aria-label="최근 누른 키">
            {keys.map((text, i) => (
              <kbd className={styles.chip} key={"live" + String(i) + text}>{text}</kbd>
            ))}
            {live
              ? SEED.map((text, i) => (
                <kbd className={[styles.chip, styles.dup].join(" ")} aria-hidden="true" key={"dup" + String(i) + text}>{text}</kbd>
              ))
              : null}
          </div>
        </div>
        <p className={styles.note}>오래된 것부터 옅어집니다</p>
      </div>
    </main>
  );
}
