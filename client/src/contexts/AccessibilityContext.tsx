import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type FontSize = "sm" | "md" | "lg" | "xl";

interface AccessibilityContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  reset: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

const STORAGE_KEY = "ms-a11y";
const DEFAULT_FONT_SIZE: FontSize = "md";

interface Stored {
  fontSize: FontSize;
  highContrast: boolean;
}

function loadStored(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { fontSize: DEFAULT_FONT_SIZE, highContrast: false };
    const parsed = JSON.parse(raw);
    return {
      fontSize: (["sm", "md", "lg", "xl"] as const).includes(parsed.fontSize) ? parsed.fontSize : DEFAULT_FONT_SIZE,
      highContrast: !!parsed.highContrast,
    };
  } catch {
    return { fontSize: DEFAULT_FONT_SIZE, highContrast: false };
  }
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const initial = loadStored();
  const [fontSize, setFontSizeState] = useState<FontSize>(initial.fontSize);
  const [highContrast, setHighContrastState] = useState<boolean>(initial.highContrast);

  /* Apply CSS classes on <html> */
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("font-size-sm", "font-size-md", "font-size-lg", "font-size-xl");
    html.classList.add(`font-size-${fontSize}`);
  }, [fontSize]);

  useEffect(() => {
    const html = document.documentElement;
    if (highContrast) html.classList.add("high-contrast");
    else html.classList.remove("high-contrast");
  }, [highContrast]);

  /* Persist */
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ fontSize, highContrast }),
    );
  }, [fontSize, highContrast]);

  function setFontSize(size: FontSize) {
    setFontSizeState(size);
  }
  function setHighContrast(v: boolean) {
    setHighContrastState(v);
  }
  function reset() {
    setFontSizeState(DEFAULT_FONT_SIZE);
    setHighContrastState(false);
  }

  return (
    <AccessibilityContext.Provider
      value={{ fontSize, setFontSize, highContrast, setHighContrast, reset }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextType {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error("useAccessibility doit être utilisé dans un AccessibilityProvider");
  }
  return ctx;
}
