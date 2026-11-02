"use client";

import { useEffect } from "react";

const preferencesKey = "travessia:reading:v1";

export function ThemeBootstrap() {
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(preferencesKey) ?? "null");
      const root = document.documentElement;
      root.dataset.theme = stored?.theme === "dark" ? "dark" : "light";
      root.dataset.contrast = String(stored?.contrast === true);
    } catch {
      // The default light theme remains available when storage is unavailable.
    }
  }, []);

  return null;
}
