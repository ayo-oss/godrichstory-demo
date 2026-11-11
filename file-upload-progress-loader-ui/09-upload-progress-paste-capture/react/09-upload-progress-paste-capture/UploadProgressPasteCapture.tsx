// UploadProgressPasteCapture — vanilla 판(run/329/demo/09-upload-progress-paste-capture/index.html) 의 React 포트.
// 드래그 없이 Ctrl+V 만으로 클립보드의 이미지를 받는다. e.clipboardData(DataTransfer)의 items 에서
// image/* 항목을 찾아 파일로 꺼낸 뒤 인디터미네이트 링을 잠깐 돌리고 썸네일로 스왑한다(진행률 없는 즉시 캡처).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./UploadProgressPasteCapture.module.scss";

export type UploadProgressPasteCaptureProps = {
  duration?: string;
  easing?: string;
  color?: string;
  spinMs?: number; // 붙여넣기 후 썸네일로 바뀌기까지 회전을 보여주는 시간(ms)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type PasteEvt = { clipboardData: DataTransfer | null };

const IDLE_LABEL = "클릭 후 ";
const IDLE_KEY = "Ctrl+V";
const DONE_LABEL = "이미지 캡처됨";
const ARIA_LABEL = "붙여넣기로 이미지 업로드, 클릭 후 Ctrl+V";

export default function UploadProgressPasteCapture({
  duration = "2s",
  easing = "ease-out",
  color = "#7ec8e3",
  spinMs = 620
}: UploadProgressPasteCaptureProps) {
  const [demo, setDemo] = useState(true);
  const [phase, setPhase] = useState<"idle" | "spin" | "done">("idle");
  const [imgUrl, setImgUrl] = useState("");
  const objectUrlRef = useRef<string | null>(null);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function process(file: File): void {
    setPhase("spin");
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setTimeout(() => {
      setImgUrl(objectUrl);
      setPhase("done");
    }, spinMs);
  }

  function onPaste(e: PasteEvt): void {
    if (!e.clipboardData) return;
    const data = e.clipboardData;
    const items = data.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file" && items[i].type.indexOf("image/") === 0) {
        const file = items[i].getAsFile();
        if (file) { process(file); break; }
      }
    }
  }

  function live(): void {
    if (!demo) return;
    setDemo(false);
    setPhase("idle");
  }

  const rootCls = [
    styles.pc,
    demo ? styles.isDemo : "",
    !demo && phase === "idle" ? styles.isIdle : "",
    phase === "spin" ? styles.isSpin : "",
    phase === "done" ? styles.isDone : ""
  ].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <div
        className={rootCls}
        style={vars}
        role="group"
        tabIndex={0}
        aria-label={ARIA_LABEL}
        onPointerDown={live}
        onFocus={live}
        onPaste={onPaste}
      >
        <div className={styles.idle}>
          <svg viewBox="0 0 256 256" width="26" height="26" aria-hidden="true"><g fill="currentColor"><path d="M216 44h-40.6a36 36 0 0 0-64.8 0H80a12 12 0 0 0-12 12v20a4 4 0 0 0 4 4h112a4 4 0 0 0 4-4V56a12 12 0 0 0-12-12" opacity=".2"/><path d="M216 36h-33.5a44 44 0 0 0-77 0H72a20 20 0 0 0-20 20v168a20 20 0 0 0 20 20h144a20 20 0 0 0 20-20V56a20 20 0 0 0-20-20m-88-8a28 28 0 0 1 26.6 20H101.4A28 28 0 0 1 128 28m88 196H72V56h16v16a12 12 0 0 0 12 12h56a12 12 0 0 0 12-12V56h16Z"/></g></svg>
          <span className={styles.idleLabel}>{IDLE_LABEL}<b>{IDLE_KEY}</b></span>
        </div>
        <svg className={styles.spin} viewBox="0 0 120 120" width="52" height="52" aria-hidden="true">
          <circle className={styles.spinTrack} cx="60" cy="60" r="48"></circle>
          <circle className={styles.spinArc} cx="60" cy="60" r="48"></circle>
        </svg>
        <div className={styles.thumb}>
          <img className={styles.img} src={imgUrl || undefined} alt="" />
          <span className={styles.doneLabel}>{DONE_LABEL}</span>
        </div>
      </div>
    </main>
  );
}
