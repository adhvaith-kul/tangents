"use client";
// X's dropdown: a black panel with a soft white glow, anchored over the button
// that opened it, closed by a click anywhere else, Escape, scroll or resize.
// Rendered in a portal; clicks inside never reach the post row underneath.
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface MenuItem {
  icon?: ReactNode;
  label: ReactNode;
  onSelect: () => void;
  /** Destructive: drawn in red, as X draws Delete. */
  danger?: boolean;
}

export function Menu({
  anchor,
  align = "right",
  items,
  onClose,
}: {
  anchor: DOMRect;
  /** Which edge of the anchor the menu lines up with. */
  align?: "left" | "right";
  items: MenuItem[];
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(anchor.top);

  useLayoutEffect(() => {
    const h = panel.current?.offsetHeight ?? 0;
    // Open downwards from the anchor; flip upwards when it would leave the viewport.
    const next = anchor.top + h > window.innerHeight - 8 ? Math.max(8, anchor.bottom - h) : anchor.top;
    if (next !== top) setTop(next);
  }, [anchor, items.length, top]);

  useLayoutEffect(() => {
    const close = () => onClose();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const position =
    align === "right" ? { top, right: window.innerWidth - anchor.right } : { top, left: anchor.left };

  return createPortal(
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="contents"
    >
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={panel}
        role="menu"
        style={position}
        className="fixed z-50 w-max max-w-[384px] overflow-hidden rounded-xl bg-[#141414] py-0 shadow-[0_4px_12px_rgba(0,0,0,0.5),0_0_2px_rgba(0,0,0,0.35)]"
      >
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              item.onSelect();
            }}
            className={`flex w-full items-center px-4 py-3 text-left text-[15px] font-bold leading-5 transition-colors hover:bg-x-hover-soft ${item.danger ? "text-x-red" : "text-x-text"}`}
          >
            {item.icon ? <span className="mr-3 flex shrink-0">{item.icon}</span> : null}
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
