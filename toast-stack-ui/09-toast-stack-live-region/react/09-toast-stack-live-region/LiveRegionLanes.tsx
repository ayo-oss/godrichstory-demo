import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LiveRegionLanes.module.scss";

export type Lane = "polite" | "alert";
export type LiveRegionLanesProps = {
  messages?: Record<Lane, string>;
  tags?: Record<Lane, string>;
  laneLabels?: Record<Lane, string>;
  buttons?: Record<Lane, string>;
  sayCap?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--easing"?: string; "--color"?: string };
const LANES: Lane[] = ["polite", "alert"];

export default function LiveRegionLanes({
  messages = { polite: "Mail sent", alert: "The payment was declined" },
  tags = { polite: "waits its turn", alert: "cuts in" },
  laneLabels = { polite: "Polite notification lane", alert: "Urgent notification lane" },
  buttons = { polite: "Normal notice", alert: "Error notice" },
  sayCap = "reading",
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#4cd4a6",
}: LiveRegionLanesProps) {
  const [demo, setDemo] = useState(true);
  const [lane, setLane] = useState<Lane>("polite");
  const [beat, setBeat] = useState(0);
  const [blank, setBlank] = useState<Lane | "">("");
  const timer = useRef<number[]>([0]);
  const vars: Vars = { "--easing": easing, "--color": color };

  useEffect(() => () => { clearTimeout((timer.current ?? [0])[0]); }, []);

  // 같은 글자를 비웠다 다시 넣어야 스크린리더가 한 번 더 읽는다
  function send(next: Lane) {
    setDemo(false);
    setLane(next);
    setBeat((v) => v + 1);
    setBlank(next);
    const t = timer.current ?? [0];
    clearTimeout(t[0]);
    t[0] = setTimeout(() => setBlank(""), 40) as unknown as number;
  }

  return (
    <div className={`${styles.lr} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.grid}>
        {LANES.map((l) => (
          <div key={l} className={`${styles.col} ${!demo && lane === l ? styles.isLive : ""}`} data-lane={l}>
            <span className={styles.tag}><code>{l === "alert" ? 'role="alert"' : 'role="status"'}</code> {tags[l]}</span>
            <p
              className={styles.card}
              role={l === "alert" ? "alert" : "status"}
              aria-live={l === "alert" ? "assertive" : "polite"}
              aria-atomic="true"
              aria-label={laneLabels[l]}
            >
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.msg} key={`${l}-${beat}`}>{blank === l ? "" : messages[l]}</span>
            </p>
          </div>
        ))}
      </div>
      <div className={styles.say} data-lane={demo ? undefined : lane}>
        <span className={styles.wave} aria-hidden="true"><i /><i /><i /></span>
        <span className={styles.saycap}>{sayCap}</span>
        <span className={styles.saytxt}>
          {LANES.map((l) => (
            <span key={l} className={styles.sayone} data-lane={l}>{messages[l]}</span>
          ))}
        </span>
      </div>
      <div className={styles.btns}>
        {LANES.map((l) => (
          <button key={l} className={styles.btn} type="button" data-lane={l} onClick={() => send(l)}>{buttons[l]}</button>
        ))}
      </div>
    </div>
  );
}
