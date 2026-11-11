import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import styles from "./BulkSelectToolbar.module.scss";

export type BulkSelectToolbarProps = {
  files: string[];
  /** 툴바가 올라오는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 체크박스·툴바 강조 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BulkSelectToolbar({
  files,
  duration = 300,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: BulkSelectToolbarProps) {
  const [checked, setChecked] = useState<boolean[]>(files.map(() => false));
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const count = useMemo(() => checked.filter(Boolean).length, [checked]);
  const allChecked = count === files.length;
  const someChecked = count > 0 && !allChecked;
  const allRef = useRef<HTMLInputElement | null>(null);

  // .indeterminate 는 DOM 프로퍼티일 뿐 HTML 속성이 아니라서 JSX 에 그대로 못 준다 — ref 로 직접 써야 한다
  // (vanilla 판의 all.indeterminate = n > 0 && n < items.length 와 동일한 지점)
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = someChecked;
  }, [someChecked]);

  const toggleOne = (i: number) => {
    const next = checked.slice();
    next[i] = !next[i];
    setChecked(next);
  };
  const toggleAll = () => setChecked(files.map(() => !allChecked));

  return (
    <div className={`${styles.list} ${count > 0 ? styles.hasSelection : ""}`} style={vars}>
      <label className={`${styles.row} ${styles.rowAll}`}>
        <input ref={allRef} type="checkbox" checked={allChecked} onChange={toggleAll} />
        <span>전체 선택</span>
      </label>
      {files.map((f, i) => (
        <label className={styles.row} key={f}>
          <input type="checkbox" checked={checked[i]} onChange={() => toggleOne(i)} />
          <span>{f}</span>
        </label>
      ))}
      <div className={styles.toolbar}>
        <span className={styles.count}>{count}개 선택됨</span>
        <button type="button">이동</button>
        <button type="button">삭제</button>
      </div>
    </div>
  );
}
