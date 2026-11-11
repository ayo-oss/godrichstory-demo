import { useCallback, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./UndoToast.module.scss";

export type UndoToastProps = {
  message: string;
  undoLabel?: string;
  cancelledMessage?: string;
  onExpire?: () => void;
  /** 몇 ms 뒤 자동으로 onExpire 를 부를지 (기본 4000ms) */
  timeout?: number;
  color?: string;
};

type Vars = CSSProperties & { "--color"?: string };

export default function UndoToast({
  message,
  undoLabel = "실행 취소",
  cancelledMessage = "취소되었습니다",
  onExpire,
  timeout = 4000,
  color = "#0a4fe8",
}: UndoToastProps) {
  const [cancelled, setCancelled] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (timer.current === null && onExpire) {
    timer.current = setTimeout(onExpire, timeout);
  }

  const undo = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setCancelled(true);
  }, []);

  const vars: Vars = { "--color": color };

  return (
    <div className={styles.toast} style={vars} role="status" aria-live="polite">
      <p className={styles.text}>{cancelled ? cancelledMessage : message}</p>
      {!cancelled && (
        <button className={styles.undo} type="button" onClick={undo}>
          {undoLabel}
        </button>
      )}
    </div>
  );
}
