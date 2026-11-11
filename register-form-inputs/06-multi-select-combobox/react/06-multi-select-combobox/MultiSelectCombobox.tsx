import { useEffect, useRef, useState } from "react";
import styles from "./MultiSelectCombobox.module.scss";

type Option = { value: string; label: string };

const OPTIONS: Option[] = [
  { value: "design", label: "디자인" },
  { value: "dev", label: "개발" },
  { value: "marketing", label: "마케팅" },
  { value: "planning", label: "기획" },
];

export default function MultiSelectCombobox() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openList = () => setOpen(true);
  const closeList = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus({ preventScroll: true });
  };

  const toggleOption = (i: number) => {
    const value = OPTIONS[i].value;
    setSelected((prev) =>
      prev.indexOf(value) > -1 ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const onTriggerKeyDown = (e: any) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].indexOf(e.key) !== -1) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % OPTIONS.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + OPTIONS.length) % OPTIONS.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleOption(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeList(true);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closeList(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [open]);

  const chips = OPTIONS.filter((o) => selected.indexOf(o.value) > -1);

  return (
    <div className={styles.multi} ref={wrapRef}>
      <span className={styles.label} id="multi-label">관심 분야</span>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="multi-listbox"
        aria-labelledby="multi-label multi-trigger"
        aria-describedby="multi-hint"
        id="multi-trigger"
        aria-activedescendant={open ? `multi-opt-${active}` : undefined}
        onClick={() => (open ? closeList(true) : openList())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={styles.chips}>
          {chips.length === 0 ? (
            <span className={styles.placeholder}>관심 분야 선택</span>
          ) : (
            chips.map((c) => (
              <span key={c.value} className={styles.chip}>{c.label}</span>
            ))
          )}
        </span>
        <span className={styles.chevron + (open ? " " + styles.chevronOpen : "")} aria-hidden="true" />
      </button>
      {open && (
        <ul className={styles.listbox} id="multi-listbox" role="listbox" aria-multiselectable="true" aria-label="관심 분야 목록">
          {OPTIONS.map((o, i) => {
            const isSelected = selected.indexOf(o.value) > -1;
            return (
              <li
                key={o.value}
                id={`multi-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                className={styles.option + (i === active ? " " + styles.optionActive : "")}
                onClick={() => {
                  setActive(i);
                  toggleOption(i);
                }}
                onPointerEnter={() => setActive(i)}
              >
                <span className={styles.check + (isSelected ? " " + styles.checkOn : "")} aria-hidden="true" />
                {o.label}
              </li>
            );
          })}
        </ul>
      )}
      <p className={styles.hint} id="multi-hint">화살표로 이동 · Enter로 선택/해제 · Esc로 닫기</p>
    </div>
  );
}
