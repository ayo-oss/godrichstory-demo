// CuteBellyLaughBean — vanilla 판(run/075/demo/03-cute-belly-laugh-bean) 의 React 포트.
// 누를 때마다 웃음 단계가 0→1→2→3 까지 커지고 다시 누르면 처음으로 돌아간다(data-level).
import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CuteBellyLaughBean.module.scss";

export type CuteBellyLaughBeanProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const LABELS = ["웃음 0단계", "웃음 1단계", "웃음 2단계", "웃음 3단계 — 폭 접힘"];

export default function CuteBellyLaughBean(props: CuteBellyLaughBeanProps) {
  const duration = props.duration ?? 2000;
  const easing = props.easing ?? "cubic-bezier(.2, 1.4, .4, 1)";
  const color = props.color ?? "#b9a0ff";
  const [level, setLevel] = useState<number>(0);
  const [preview, setPreview] = useState<boolean>(true);
  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  return (
    <main className={styles.stage}>
      <div
        className={styles.bn + (preview ? " " + styles.isDemo : "")}
        style={vars}
        data-level={level}
      >
        <button
          className={styles.hit}
          type="button"
          aria-label="콩알 친구 웃기기"
          onClick={() => setLevel((level + 1) % 4)}
          onPointerDown={() => setPreview(false)}
        >
          <span className={styles.scene} aria-hidden="true">
            <span className={styles.shadow}></span>
            <span className={styles.bean} key={"fold" + level}>
              <span className={styles.eye + " " + styles.eyeL}></span>
              <span className={styles.eye + " " + styles.eyeR}></span>
              <span className={styles.mouth}><span className={styles.tongue}></span></span>
              <span className={styles.arm + " " + styles.armL}></span>
              <span className={styles.arm + " " + styles.armR}></span>
            </span>
          </span>
        </button>
        <p className={styles.level} aria-hidden="true">{LABELS[level]}</p>
      </div>
    </main>
  );
}
