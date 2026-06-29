"use client";

import { useEffect } from "react";

function isTextInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;

  if (target instanceof HTMLTextAreaElement) return true;

  if (target instanceof HTMLInputElement) {
    const type = target.type.toLowerCase();
    return !["hidden", "file", "button", "submit", "reset", "checkbox", "radio", "image"].includes(
      type
    );
  }

  return target.isContentEditable;
}

export function ClipboardBlocker() {
  useEffect(() => {
    const blockClipboard = (event: ClipboardEvent) => {
      if (isTextInputElement(event.target)) {
        event.preventDefault();
      }
    };

    const blockKeyboard = (event: KeyboardEvent) => {
      if (!isTextInputElement(event.target)) return;

      const mod = event.ctrlKey || event.metaKey;
      if (mod && (event.key === "c" || event.key === "v" || event.key === "x")) {
        event.preventDefault();
        return;
      }

      if (event.shiftKey && event.key === "Insert") {
        event.preventDefault();
      }
    };

    document.addEventListener("paste", blockClipboard, true);
    document.addEventListener("copy", blockClipboard, true);
    document.addEventListener("cut", blockClipboard, true);
    document.addEventListener("keydown", blockKeyboard, true);

    return () => {
      document.removeEventListener("paste", blockClipboard, true);
      document.removeEventListener("copy", blockClipboard, true);
      document.removeEventListener("cut", blockClipboard, true);
      document.removeEventListener("keydown", blockKeyboard, true);
    };
  }, []);

  return null;
}
