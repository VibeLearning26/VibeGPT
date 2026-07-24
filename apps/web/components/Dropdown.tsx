"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "reicon-react";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  /** "chip" = pill trigger for inline use; "field" = full-width input-style trigger for forms. */
  variant?: "chip" | "field";
  placeholder?: string;
  ariaLabel?: string;
  /** Align the menu to the right edge of the trigger. */
  align?: "left" | "right";
  /** Open the menu below (default) or above the trigger. */
  direction?: "down" | "up";
}

export function Dropdown({
  options,
  value,
  onChange,
  variant = "field",
  placeholder = "Select…",
  ariaLabel,
  align = "left",
  direction = "down",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % options.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h - 1 + options.length) % options.length);
      } else if (e.key === "Enter" && highlight >= 0 && options[highlight]) {
        e.preventDefault();
        onChange(options[highlight].value);
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, options, highlight, onChange]);

  const toggle = () => {
    setHighlight(options.findIndex((o) => o.value === value));
    setOpen((v) => !v);
  };

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const triggerClass = `${variant === "chip" ? "dropdown-trigger-chip" : "dropdown-trigger-field"} ${
    open ? "open" : ""
  }`;

  return (
    <div ref={rootRef} className={`dropdown ${variant === "field" ? "w-full" : ""}`}>
      <button
        type="button"
        onClick={toggle}
        className={triggerClass}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        {selected ? (
          <span className="truncate">{selected.label}</span>
        ) : (
          <span className="placeholder truncate">{placeholder}</span>
        )}
        <ChevronDown size={variant === "chip" ? 14 : 16} className="dropdown-chevron" />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className={`dropdown-menu ${align === "right" ? "right-0" : "left-0"} ${
            direction === "up" ? "up" : ""
          }`}
          style={
            direction === "up"
              ? { bottom: "100%", top: "auto", marginTop: 0, marginBottom: 8 }
              : undefined
          }
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => choose(o.value)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`dropdown-item ${isSelected ? "selected" : ""} ${
                    i === highlight && !isSelected ? "highlighted" : ""
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {isSelected && <Check size={14} className="dropdown-check" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
