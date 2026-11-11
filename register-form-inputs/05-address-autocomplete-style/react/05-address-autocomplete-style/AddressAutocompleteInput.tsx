import { useRef, useState } from "react";
import styles from "./AddressAutocompleteInput.module.scss";

const ADDRESSES = [
  "서울 강남구 테헤란로 14",
  "서울 마포구 월드컵로 3",
  "부산 해운대구 센텀로 99",
  "대구 수성구 동대구로 7",
  "인천 연수구 컨벤시아대로 5",
];

export default function AddressAutocompleteInput() {
  const [value, setValue] = useState("");
  const [matches, setMatches] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filter = (query: string) => {
    const trimmed = query.trim();
    const next = trimmed ? ADDRESSES.filter((a) => a.indexOf(trimmed) > -1) : [];
    setMatches(next);
    setActive(-1);
    setOpen(Boolean(trimmed) && next.length > 0);
  };

  const onChange = (e: any) => {
    const v = String(e.target.value);
    setValue(v);
    filter(v);
  };

  const selectOption = (i: number) => {
    const text = matches[i];
    if (text === undefined) return;
    setValue(text);
    setOpen(false);
    setActive(-1);
    setMatches([]);
    inputRef.current?.focus({ preventScroll: true });
  };

  const onKeyDown = (e: any) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open && matches.length) { setOpen(true); setActive(0); return; }
      if (open && matches.length) setActive((a) => Math.min(a + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (open) setActive((a) => (a <= 0 ? -1 : a - 1));
    } else if (e.key === "Enter") {
      if (open && active > -1) {
        e.preventDefault();
        selectOption(active);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setActive(-1);
      }
    }
  };

  const activeId = active > -1 ? `addr-opt-${active}` : undefined;

  return (
    <div className={styles.addr} ref={wrapRef}>
      <label className={styles.label} htmlFor="addr-input">배송지 주소</label>
      <div className={styles.field}>
        <input
          ref={inputRef}
          id="addr-input"
          className={styles.input}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="addr-listbox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-describedby="addr-hint"
          aria-activedescendant={activeId}
          autoComplete="off"
          placeholder="주소를 입력하세요"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onBlur={() => setOpen(false)}
        />
        {open && matches.length > 0 && (
          <ul className={styles.listbox} id="addr-listbox" role="listbox" aria-label="주소 후보">
            {matches.map((text, i) => (
              <li
                key={text}
                id={`addr-opt-${i}`}
                role="option"
                aria-selected={i === active}
                className={styles.option + (i === active ? " " + styles.optionActive : "")}
                onMouseDown={(e: any) => e.preventDefault()}
                onClick={() => selectOption(i)}
                onPointerEnter={() => setActive(i)}
              >
                {text}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className={styles.hint} id="addr-hint">화살표 키로 고르고 Enter로 채우기</p>
    </div>
  );
}
