import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ShareQrPopup.module.scss";

export type ShareQrPopupProps = {
  /** 29×29 모듈 행렬. "1" 이 검은 칸이다 */
  rows?: string[];
  /** 팝업이 서고 스캔 선이 훑는 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  /** 스캔 선 색 */
  color?: string;
  autoPlay?: boolean;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type GridVars = CSSProperties & { "--cells"?: number };

/* https://godrichstory.com 을 담은 모듈 행렬 — 이미지 파일이 아니라 검은 칸 좌표다 */
const QR_ROWS: string[] = ["00000000000000000000000000000", "00000000000000000000000000000", "00111111101100010010111111100", "00100000100000010000100000100", "00101110101001111000101110100", "00101110101101011110101110100", "00101110101111000110101110100", "00100000100100100000100000100", "00111111101010101010111111100", "00000000000101001100000000000", "00111100101000001001001110100", "00001001010100011010010001000", "00100110110000001000110000000", "00111010001001111011100110000", "00110000111101010001101011100", "00010001000011011111111000100", "00010111111100101001001011000", "00100101001000100000111000100", "00111000110111010011111111100", "00000000001010110010001010100", "00111111100001110010101011100", "00100000100000100110001001000", "00101110100001001011111100100", "00101110101100110001101111100", "00101110101001110010101011000", "00100000101010111000001010000", "00111111101101111000011111100", "00000000000000000000000000000", "00000000000000000000000000000"];

export default function ShareQrPopup({
  rows = QR_ROWS,
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#7fd4f5",
  autoPlay = true,
}: ShareQrPopupProps) {
  const [demo, setDemo] = useState(autoPlay);
  const [open, setOpen] = useState(true);

  /* 사람이 손을 대면 자동 재생을 끈다 */
  function stopDemo() {
    setDemo(false);
  }

  function applyToggle() {
    stopDemo();
    setOpen((prev) => !prev);
  }

  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };
  const cells: string[] = [];
  rows.forEach((line) => line.split("").forEach((bit) => cells.push(bit)));

  return (
    <div className={styles.stage + (demo ? " " + styles.isDemo : "")} style={vars}>
      <section className={styles.qr + (open ? "" : " " + styles.isClosed)}>
        <button
          className={styles.open}
          type="button"
          aria-expanded={open}
          onClick={applyToggle}
          onPointerDown={stopDemo}
          onFocus={stopDemo}
        >
          <span className={styles.ic}><svg width="20" height="20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M112,56v48a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8h48A8,8,0,0,1,112,56Zm-8,88H56a8,8,0,0,0-8,8v48a8,8,0,0,0,8,8h48a8,8,0,0,0,8-8V152A8,8,0,0,0,104,144Zm96-96H152a8,8,0,0,0-8,8v48a8,8,0,0,0,8,8h48a8,8,0,0,0,8-8V56A8,8,0,0,0,200,48Z" opacity="0.2"/><path d="M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm0,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48ZM200,40H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-64,72V144a8,8,0,0,1,16,0v32a8,8,0,0,1-16,0Zm80-16a8,8,0,0,1-8,8H184v40a8,8,0,0,1-8,8H144a8,8,0,0,1,0-16h24V144a8,8,0,0,1,16,0v8h24A8,8,0,0,1,216,160Zm0,32v16a8,8,0,0,1-16,0V192a8,8,0,0,1,16,0Z"/></svg></span>
          <span className={styles.openName}>QR 로 공유</span>
        </button>

        <div className={styles.pop} role="dialog" aria-label="QR 코드로 공유">
          <div className={styles.code}>
            <div
              className={styles.grid}
              role="img"
              aria-label="주소를 담은 QR 코드"
              style={{ "--cells": rows.length } as GridVars}
            >
              {cells.map((bit, i) => (
                <span key={i} className={styles.cell + (bit === "1" ? " " + styles.isOn : "")} />
              ))}
            </div>
            <span className={styles.scan} aria-hidden="true" />
          </div>
          <p className={styles.hint}>
            <span className={styles.hintIc} aria-hidden="true"><svg width="16" height="16" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M192,56V200H64V56Z" opacity="0.2"/><path d="M176,16H80A24,24,0,0,0,56,40V216a24,24,0,0,0,24,24h96a24,24,0,0,0,24-24V40A24,24,0,0,0,176,16ZM72,64H184V192H72Zm8-32h96a8,8,0,0,1,8,8v8H72V40A8,8,0,0,1,80,32Zm96,192H80a8,8,0,0,1-8-8v-8H184v8A8,8,0,0,1,176,224Z"/></svg></span>
            <span>카메라로 비추면 열립니다</span>
          </p>
        </div>
      </section>
    </div>
  );
}
