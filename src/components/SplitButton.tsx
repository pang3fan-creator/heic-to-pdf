"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

interface SplitButtonItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
}

interface SplitButtonProps {
  label: string;
  menuLabel: string;
  items: SplitButtonItem[];
  onMainClick: () => void;
  icon?: ReactNode;
  variant?: "primary" | "editor";
}

export default function SplitButton({
  label,
  menuLabel,
  items,
  onMainClick,
  icon,
  variant = "primary",
}: SplitButtonProps) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const closeMenu = () => {
    setOpen(false);
  };

  const focusItem = (index: number) => {
    itemRefs.current[index]?.focus();
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      window.requestAnimationFrame(() => focusItem(0));
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const activeIndex = itemRefs.current.findIndex((item) => item === document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItem(activeIndex < items.length - 1 ? activeIndex + 1 : 0);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusItem(activeIndex > 0 ? activeIndex - 1 : items.length - 1);
    }
  };

  return (
    <div
      className={`split-btn-wrap split-btn-${variant}`}
      ref={wrapRef}
    >
      <button
        className="split-btn-main"
        onClick={() => {
          closeMenu();
          onMainClick();
        }}
        type="button"
      >
        {icon}
        {label}
      </button>
      <button
        ref={triggerRef}
        className="split-btn-trigger"
        type="button"
        aria-label={menuLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setOpen((current) => !current);
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          id={menuId}
          className="split-btn-dropdown"
          role="menu"
          aria-label={menuLabel}
          onKeyDown={handleMenuKeyDown}
        >
          {items.map((item, index) => (
            <button
              key={item.key}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              onClick={() => {
                closeMenu();
                item.onSelect();
              }}
              role="menuitem"
              type="button"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
