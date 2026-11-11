import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import styles from "./DialogDrawer.module.scss";

export type DialogDrawerProps = {
  duration?: number;
  easing?: string;
  color?: string;
  /** 마운트되면 바로 열어 보여줄지(데모용) */
  defaultOpen?: boolean;
};

export default function DialogDrawer({
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
  defaultOpen = false,
}: DialogDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onClose = () => setOpen(false);
    dlg.addEventListener("close", onClose);
    return () => dlg.removeEventListener("close", onClose);
  }, []);

  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars}>
      <button className={styles.trigger} type="button" onClick={() => setOpen(true)}>설정 열기</button>
      <dialog
        ref={dialogRef}
        className={styles.drawer}
        aria-label="설정"
        onClick={(e: MouseEvent<HTMLDialogElement>) => { if (e.target === dialogRef.current) setOpen(false); }}
      >
        <h2>설정</h2>
        <p>브라우저의 dialog 요소가 ESC·포커스 가두기를 대신 관리한다.</p>
        <button className={styles.close} type="button" onClick={() => setOpen(false)}>닫기</button>
      </dialog>
    </div>
  );
}
