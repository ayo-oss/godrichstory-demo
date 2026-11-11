import { useRef, useState } from "react";
import styles from "./TextareaAutogrow.module.scss";

export type TextareaAutogrowProps = {
  label?: string;
  placeholder?: string;
  maxHeight?: number;
};

export default function TextareaAutogrow({
  label = "후기 작성",
  placeholder = "이 상품을 써 본 느낌을 알려주세요",
  maxHeight = 132,
}: TextareaAutogrowProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
  };

  return (
    <div className={styles.grow}>
      <label className={styles.label}>{label}</label>
      <textarea
        ref={ref}
        className={styles.area}
        rows={1}
        placeholder={placeholder}
        value={value}
        style={{ maxHeight }}
        onChange={(e: any) => {
          setValue(e.target.value);
          resize();
        }}
      />
    </div>
  );
}
