"use client";
// X's toast: a small blue bar at the bottom centre that fades after a few
// seconds. Imperative, because it has to outlive the component that raised it
// (a deleted post's card is gone by the time the toast shows).

let current: HTMLElement | null = null;

export function toast(text: string): void {
  if (typeof document === "undefined") return;
  current?.remove();
  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.textContent = text;
  el.className =
    "fixed bottom-8 left-1/2 z-[60] -translate-x-1/2 rounded bg-x-blue px-4 py-3 text-[15px] leading-5 text-white shadow-lg transition-opacity duration-300";
  document.body.appendChild(el);
  current = el;
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => {
      el.remove();
      if (current === el) current = null;
    }, 300);
  }, 3200);
}
