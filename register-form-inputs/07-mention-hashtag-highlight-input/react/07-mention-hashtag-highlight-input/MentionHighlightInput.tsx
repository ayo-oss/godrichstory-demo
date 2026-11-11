import { useRef, useState, type ChangeEvent } from "react";
import styles from "./MentionHighlightInput.module.scss";

export type MentionHighlightInputProps = {
  label?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function highlight(s: string): string {
  const escaped = escapeHtml(s);
  return escaped.replace(/([@#])([\w가-힣]+)/g, (m) => `<mark>${m}</mark>`);
}

export default function MentionHighlightInput({ label = "메시지" }: MentionHighlightInputProps) {
  const [value, setValue] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value);

  const onScroll = () => {
    if (backdropRef.current && inputRef.current) {
      backdropRef.current.scrollTop = inputRef.current.scrollTop;
    }
  };

  const html = highlight(value) + (value.slice(-1) === "\n" ? " " : "");

  return (
    <div className={styles.mh}>
      <label className={styles.label} htmlFor="mh-input-react">
        {label}
      </label>
      <div className={styles.field}>
        <div
          className={styles.backdrop}
          aria-hidden="true"
          ref={backdropRef}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <textarea
          id="mh-input-react"
          className={styles.input}
          ref={inputRef}
          rows={3}
          value={value}
          onChange={onChange}
          onScroll={onScroll}
          aria-describedby="mh-hint-react"
        />
      </div>
      <p className={styles.hint} id="mh-hint-react">
        @이름 #태그를 입력해 보세요
      </p>
    </div>
  );
}
