import { useEffect, useRef, useState } from "react";
import styles from "./PhoneCountryInput.module.scss";

type CountryCode = "kr" | "us" | "jp";

type Country = {
  name: string;
  flag: string;
  dial: string;
  groups: number[];
};

const COUNTRIES: Record<CountryCode, Country> = {
  kr: { name: "대한민국", flag: "🇰🇷", dial: "+82", groups: [3, 4, 4] },
  us: { name: "미국", flag: "🇺🇸", dial: "+1", groups: [3, 3, 4] },
  jp: { name: "일본", flag: "🇯🇵", dial: "+81", groups: [2, 4, 4] },
};

const ORDER: CountryCode[] = ["kr", "us", "jp"];

function formatDigits(digits: string, groups: number[]): string {
  const out: string[] = [];
  let i = 0;
  for (let g = 0; g < groups.length && i < digits.length; g++) {
    out.push(digits.slice(i, i + groups[g]));
    i += groups[g];
  }
  return out.join(" ");
}

function maxDigits(groups: number[]): number {
  return groups.reduce((a, b) => a + b, 0);
}

export default function PhoneCountryInput() {
  const [country, setCountry] = useState<CountryCode>("kr");
  const [number, setNumber] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const current = COUNTRIES[country];

  const openList = () => {
    setActive(ORDER.indexOf(country));
    setOpen(true);
  };

  const closeList = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus({ preventScroll: true });
  };

  const selectCountry = (code: CountryCode) => {
    setCountry(code);
    setNumber((prev) => {
      const digits = prev.replace(/\D/g, "").slice(0, maxDigits(COUNTRIES[code].groups));
      return formatDigits(digits, COUNTRIES[code].groups);
    });
  };

  const onNumberChange = (e: any) => {
    const digits = String(e.target.value).replace(/\D/g, "").slice(0, maxDigits(current.groups));
    setNumber(formatDigits(digits, current.groups));
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
      setActive((a) => (a + 1) % ORDER.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + ORDER.length) % ORDER.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectCountry(ORDER[active]);
      closeList(true);
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

  return (
    <div className={styles.phone} ref={wrapRef}>
      <span className={styles.label} id="phone-label">전화번호</span>
      <div className={styles.row}>
        <div className={styles.triggerWrap}>
          <button
            ref={triggerRef}
            type="button"
            className={styles.trigger}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls="phone-listbox"
            aria-activedescendant={open ? `phone-opt-${ORDER[active]}` : undefined}
            aria-label={`국가 선택, 현재 ${current.name}`}
            onClick={() => (open ? closeList(true) : openList())}
            onKeyDown={onTriggerKeyDown}
          >
            <span className={styles.flag} aria-hidden="true">{current.flag}</span>
            <span className={styles.dial}>{current.dial}</span>
            <span className={styles.chevron + (open ? " " + styles.chevronOpen : "")} aria-hidden="true" />
          </button>
          {open && (
            <ul className={styles.listbox} id="phone-listbox" role="listbox" aria-label="국가 목록">
              {ORDER.map((code, i) => (
                <li
                  key={code}
                  role="option"
                  id={`phone-opt-${code}`}
                  aria-selected={code === country}
                  className={styles.option + (i === active ? " " + styles.optionActive : "")}
                  onClick={() => {
                    selectCountry(code);
                    closeList(true);
                  }}
                  onPointerEnter={() => setActive(i)}
                >
                  <span aria-hidden="true">{COUNTRIES[code].flag}</span> {COUNTRIES[code].name}{" "}
                  <span className={styles.optionDial}>{COUNTRIES[code].dial}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <input
          className={styles.input}
          type="text"
          inputMode="numeric"
          placeholder="10 1234 5678"
          aria-labelledby="phone-label"
          value={number}
          onChange={onNumberChange}
        />
      </div>
    </div>
  );
}
