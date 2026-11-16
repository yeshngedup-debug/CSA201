# FinTrack UI Makeover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace FinTrack's hacked light-over-dark styling with a token-driven dual-theme UI (sidebar shell, recomposed dashboard, Nu. currency) while keeping every existing behavior identical.

**Architecture:** Semantic CSS variables declared in a Tailwind v4 `@theme` block and overridden under `:root[data-theme="dark"]`; React components consume token utilities only. State lives in two hooks (`useExpenses`, `useTheme`); `App.tsx` becomes pure composition. Spec: `docs/superpowers/specs/2026-09-04-fintrack-ui-makeover-design.md`.

**Tech Stack:** React 19, TypeScript 5.7, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), Recharts 3, bootstrap-icons. Tests: Vitest + @testing-library/react + jsdom (devDependencies only).

**Palette note:** Hex values below are the WCAG-AA-adjusted final set (spec §3 listed pre-audit values; e.g. light `brand` darkened from `#059669` to `#047857` so white button text and on-surface text both pass 4.5:1). Update spec §3 tables to match when convenient; this plan is authoritative for implementation.

**Git note:** This workspace is **not** a git repository. Every task ends with a Commit step that is intentionally a no-op here. Do NOT run `git init` unless the owner explicitly asks. If a repository exists when you run this plan, execute the listed commit command.

---

## File structure

| File | Responsibility |
|---|---|
| `src/types.ts` | `Category`, `Theme`, `Expense`, `Toast`, `View` types |
| `src/data.ts` | Categories, icons, per-theme category colors, seed data, storage keys, month window, nav config |
| `src/format.ts` | `today`, `formatDate`, `formatAmount` (Nu. prefix), `uid`, localStorage helpers |
| `src/hooks/useTheme.ts` | Theme state, `<html data-theme>` sync, persistence |
| `src/hooks/useExpenses.ts` | Expenses/history state, persistence, add/delete/undo/clear/exportCSV, toasts |
| `src/components/ThemeToggle.tsx` | Accessible light/dark switch |
| `src/components/StatCard.tsx` | Labeled stat tile with tone |
| `src/components/ToastStack.tsx` | Bottom-right toast stack with 3s auto-dismiss |
| `src/components/TrendChart.tsx` | Daily spending area chart + empty state |
| `src/components/CategoryDonut.tsx` | Category donut chart + empty state |
| `src/components/CategoryBreakdown.tsx` | Ranked category progress bars |
| `src/components/RecentList.tsx` | Five most recent expenses card |
| `src/components/TransactionTable.tsx` | Filtered transaction list with header row and total footer |
| `src/components/AddExpenseModal.tsx` | Add-expense dialog with validation |
| `src/components/Sidebar.tsx` | Desktop 240px shell (nav, actions, footer) |
| `src/components/MobileBar.tsx` | Mobile top bar, tabs, action row |
| `src/components/HeroPanel.tsx` | Total-spent hero with motif and CTAs |
| `src/App.tsx` | Composition, view state, filters, keyboard shortcuts |
| `src/index.css` | Token system, base styles, keyframes, motif |
| `index.html` | Pre-paint theme script |
| `src/test/setup.ts` | jsdom shims (matchMedia, URL.createObjectURL) |
| `vite.config.ts` | Adds `test` block for Vitest |

Test files: `src/format.test.ts`, `src/hooks/useTheme.test.tsx`, `src/hooks/useExpenses.test.tsx`, `src/components/AddExpenseModal.test.tsx`, `src/components/ThemeToggle.test.tsx`, `src/components/StatCard.test.tsx`.

---

### Task 1: Test tooling

**Files:**
- Modify: `package.json` (scripts + devDependencies)
- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Install dev dependencies**

Run:
```bash
npm install -D vitest @testing-library/react @testing-library/dom jsdom
```
Expected: exit 0, `node_modules/vitest` exists.

- [ ] **Step 2: Add test scripts to package.json**

In `package.json` `"scripts"`, add after `"format"`:
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Add Vitest config to vite.config.ts**

Change the first import line from `import { defineConfig } from 'vite'` to:
```ts
import { defineConfig } from 'vitest/config'
```
and add a `test` key inside the returned object, after `preview`:
```ts
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
    },
```

- [ ] **Step 4: Create src/test/setup.ts**

```ts
import { vi } from "vitest";

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

if (!URL.createObjectURL) {
  URL.createObjectURL = () => "blob:stub";
  URL.revokeObjectURL = () => {};
}
```

- [ ] **Step 5: Verify runner boots**

Run: `npx vitest run --passWithNoTests`
Expected: exit 0, "No test files found" tolerated.

- [ ] **Step 6: Commit** — no-op in this workspace (no git repository). If a repo exists: `git add package.json package-lock.json vite.config.ts src/test/setup.ts && git commit -m "chore: add vitest tooling"`

---

### Task 2: Foundation modules (types, data, format) — TDD

**Files:**
- Create: `src/types.ts`, `src/data.ts`, `src/format.ts`
- Test: `src/format.test.ts`

- [ ] **Step 1: Write the failing test `src/format.test.ts`**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { formatAmount, formatDate, loadFromStorage, saveToStorage, today } from "./format";

describe("formatAmount", () => {
  it("uses the Ngultrum prefix with two decimals and thousands separators", () => {
    expect(formatAmount(1300)).toBe("Nu. 1,300.00");
    expect(formatAmount(108)).toBe("Nu. 108.00");
    expect(formatAmount(0)).toBe("Nu. 0.00");
  });
});

describe("formatDate", () => {
  it("renders short month and day", () => {
    expect(formatDate("2026-09-04")).toBe("Sep 4");
  });
});

describe("today", () => {
  it("returns an ISO date", () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("storage helpers", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips JSON values", () => {
    saveToStorage("k", [{ a: 1 }]);
    expect(loadFromStorage("k", [])).toEqual([{ a: 1 }]);
  });

  it("falls back on corrupt JSON", () => {
    localStorage.setItem("bad", "{oops");
    expect(loadFromStorage("bad", "fb")).toBe("fb");
  });

  it("falls back when the key is missing", () => {
    expect(loadFromStorage("nope", 7)).toBe(7);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/format.test.ts`
Expected: FAIL — cannot resolve `./format`.

- [ ] **Step 3: Create `src/types.ts`**

```ts
export type Category =
  | "Food"
  | "Transport"
  | "Entertainment"
  | "Shopping"
  | "Health"
  | "Education"
  | "Utilities"
  | "Other";

export type Theme = "light" | "dark";

export type View = "dashboard" | "transactions";

export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: Category;
  description: string;
}

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}
```

- [ ] **Step 4: Create `src/data.ts`**

```ts
import type { Category, Expense, Theme, View } from "./types";

export const CATEGORIES: Category[] = [
  "Food", "Transport", "Entertainment", "Shopping",
  "Health", "Education", "Utilities", "Other",
];

export const CAT_ICONS: Record<Category, string> = {
  Food: "bi-cup-hot",
  Transport: "bi-bus-front",
  Entertainment: "bi-film",
  Shopping: "bi-bag",
  Health: "bi-heart-pulse",
  Education: "bi-book",
  Utilities: "bi-lightning-charge",
  Other: "bi-box",
};

export const CAT_COLORS: Record<Theme, Record<Category, string>> = {
  light: {
    Food: "#047857", Transport: "#1D4ED8", Entertainment: "#6D28D9", Shopping: "#B45309",
    Health: "#BE123C", Education: "#0E7490", Utilities: "#C2410C", Other: "#475569",
  },
  dark: {
    Food: "#34D399", Transport: "#60A5FA", Entertainment: "#C084FC", Shopping: "#FBBF24",
    Health: "#FB7185", Education: "#22D3EE", Utilities: "#FB923C", Other: "#94A3B8",
  },
};

export const VIEW_NAV: { id: View; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "bi-grid-1x2" },
  { id: "transactions", label: "Transactions", icon: "bi-list-ul" },
];

export const SEED_DATA: Expense[] = [
  { id: "1", date: "2026-09-01", amount: 120, category: "Food", description: "Grocery run" },
  { id: "2", date: "2026-09-02", amount: 40, category: "Transport", description: "Taxi to campus" },
  { id: "3", date: "2026-09-03", amount: 250, category: "Shopping", description: "Stationery & notebooks" },
  { id: "4", date: "2026-09-03", amount: 80, category: "Food", description: "Lunch with group" },
  { id: "5", date: "2026-09-04", amount: 200, category: "Entertainment", description: "Movie night + snacks" },
  { id: "6", date: "2026-09-04", amount: 60, category: "Transport", description: "Bus pass" },
  { id: "7", date: "2026-09-05", amount: 150, category: "Health", description: "Pharmacy" },
  { id: "8", date: "2026-09-05", amount: 90, category: "Utilities", description: "Electricity bill" },
  { id: "9", date: "2026-09-06", amount: 35, category: "Food", description: "Coffee & pastry" },
  { id: "10", date: "2026-09-06", amount: 45, category: "Education", description: "Online course" },
  { id: "11", date: "2026-09-07", amount: 180, category: "Shopping", description: "New shoes" },
  { id: "12", date: "2026-09-07", amount: 50, category: "Food", description: "Dinner out" },
];

export const STORAGE_KEY = "fintrack-expenses";
export const HISTORY_KEY = "fintrack-history";
export const THEME_KEY = "fintrack-theme";
export const MONTH_PREFIX = "2026-09";
export const TREND_START = "2026-09-01";
export const MONTH_LABEL = "September 2026";
```

- [ ] **Step 5: Create `src/format.ts`**

```ts
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatAmount(n: number): string {
  return `Nu. ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

export function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode / quota): run in-memory
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- src/format.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 7: Commit** — no-op (no git repository). If a repo exists: `git add src/types.ts src/data.ts src/format.ts src/format.test.ts && git commit -m "feat: add typed foundation modules with Nu. formatting"`

---

### Task 3: useTheme hook — TDD

**Files:**
- Create: `src/hooks/useTheme.ts`
- Test: `src/hooks/useTheme.test.tsx`

- [ ] **Step 1: Write the failing test `src/hooks/useTheme.test.tsx`**

```tsx
import { beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { THEME_KEY } from "../data";
import { useTheme } from "./useTheme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("useTheme", () => {
  it("defaults to light with no stored preference", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("reads a stored preference", () => {
    localStorage.setItem(THEME_KEY, "dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("ignores garbage in storage", () => {
    localStorage.setItem(THEME_KEY, "neon");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
  });

  it("toggles and persists", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/useTheme.test.tsx`
Expected: FAIL — cannot resolve `./useTheme`.

- [ ] **Step 3: Create `src/hooks/useTheme.ts`**

```ts
import { useCallback, useEffect, useState } from "react";
import { THEME_KEY } from "../data";
import type { Theme } from "../types";

function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // storage unavailable
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // storage unavailable
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => (t === "light" ? "dark" : "light"));
  }, []);

  return { theme, toggleTheme };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/useTheme.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit** — no-op (no git repository). If a repo exists: `git add src/hooks/useTheme.ts src/hooks/useTheme.test.tsx && git commit -m "feat: add persisted theme hook"`

---

### Task 4: useExpenses hook — TDD (parity contract)

**Files:**
- Create: `src/hooks/useExpenses.ts`
- Test: `src/hooks/useExpenses.test.tsx`

- [ ] **Step 1: Write the failing test `src/hooks/useExpenses.test.tsx`**

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { HISTORY_KEY, STORAGE_KEY } from "../data";
import type { Expense } from "../types";
import { useExpenses } from "./useExpenses";

const sample: Expense = {
  id: "x1", date: "2026-09-04", amount: 50, category: "Food", description: "Test meal",
};

beforeEach(() => localStorage.clear());

describe("useExpenses", () => {
  it("seeds twelve expenses on first run", () => {
    const { result } = renderHook(() => useExpenses());
    expect(result.current.expenses).toHaveLength(12);
    expect(result.current.history).toHaveLength(0);
  });

  it("add prepends to expenses and history and raises a toast", () => {
    const { result } = renderHook(() => useExpenses());
    act(() => result.current.addExpense(sample));
    expect(result.current.expenses[0]).toEqual(sample);
    expect(result.current.history[0]).toEqual(sample);
    expect(result.current.toasts[0].message).toBe("Test meal — Nu. 50.00 added");
    expect(result.current.toasts[0].type).toBe("success");
  });

  it("delete removes from expenses and pushes onto history", () => {
    const { result } = renderHook(() => useExpenses());
    const id = result.current.expenses[0].id;
    act(() => result.current.deleteExpense(id));
    expect(result.current.expenses.find(e => e.id === id)).toBeUndefined();
    expect(result.current.history[0].id).toBe(id);
  });

  it("undo restores the most recent history entry", () => {
    const { result } = renderHook(() => useExpenses());
    const id = result.current.expenses[0].id;
    act(() => result.current.deleteExpense(id));
    act(() => result.current.undoLast());
    expect(result.current.expenses[0].id).toBe(id);
    expect(result.current.history).toHaveLength(0);
  });

  it("undo with empty history is a no-op", () => {
    const { result } = renderHook(() => useExpenses());
    act(() => result.current.undoLast());
    expect(result.current.expenses).toHaveLength(12);
    expect(result.current.toasts).toHaveLength(0);
  });

  it("clearAll empties state and a fresh hook sees no seed", () => {
    const { result } = renderHook(() => useExpenses());
    act(() => result.current.clearAll());
    expect(result.current.expenses).toHaveLength(0);
    expect(result.current.history).toHaveLength(0);
    const { result: second } = renderHook(() => useExpenses());
    expect(second.current.expenses).toHaveLength(0);
  });

  it("dismissToast removes a single toast", () => {
    const { result } = renderHook(() => useExpenses());
    act(() => result.current.addExpense(sample));
    const id = result.current.toasts[0].id;
    act(() => result.current.dismissToast(id));
    expect(result.current.toasts).toHaveLength(0);
  });

  it("exportCSV builds the legacy header and rows", async () => {
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const { result } = renderHook(() => useExpenses());
    act(() => result.current.exportCSV());
    expect(click).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const text = await blob.text();
    expect(text.startsWith("Date,Description,Category,Amount\n")).toBe(true);
    expect(text).toContain("Grocery run");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
    click.mockRestore();
  });

  it("persists expenses under the legacy storage keys", () => {
    const { result } = renderHook(() => useExpenses());
    act(() => result.current.addExpense(sample));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")[0]).toEqual(sample);
    expect(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]")[0]).toEqual(sample);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/useExpenses.test.tsx`
Expected: FAIL — cannot resolve `./useExpenses`.

- [ ] **Step 3: Create `src/hooks/useExpenses.ts`**

```ts
import { useCallback, useEffect, useState } from "react";
import { HISTORY_KEY, SEED_DATA, STORAGE_KEY } from "../data";
import { formatAmount, loadFromStorage, saveToStorage, uid } from "../format";
import type { Expense, Toast } from "../types";

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadFromStorage(STORAGE_KEY, SEED_DATA));
  const [history, setHistory] = useState<Expense[]>(() => loadFromStorage(HISTORY_KEY, []));
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => { saveToStorage(STORAGE_KEY, expenses); }, [expenses]);
  useEffect(() => { saveToStorage(HISTORY_KEY, history); }, [history]);

  const pushToast = useCallback((message: string, type: Toast["type"]) => {
    setToasts(t => [...t, { id: uid(), message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addExpense = useCallback((e: Expense) => {
    setExpenses(prev => [e, ...prev]);
    setHistory(prev => [e, ...prev]);
    pushToast(`${e.description} — ${formatAmount(e.amount)} added`, "success");
  }, [pushToast]);

  const deleteExpense = useCallback((id: string) => {
    setExpenses(prev => {
      const exp = prev.find(e => e.id === id);
      if (exp) setHistory(h => [exp, ...h]);
      return prev.filter(e => e.id !== id);
    });
    pushToast("Transaction removed", "info");
  }, [pushToast]);

  const undoLast = useCallback(() => {
    if (history.length === 0) return;
    const last = history[0];
    setHistory(prev => prev.slice(1));
    setExpenses(prev => [last, ...prev]);
    pushToast(`${last.description} restored`, "info");
  }, [history, pushToast]);

  const clearAll = useCallback(() => {
    setExpenses([]);
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(HISTORY_KEY);
    pushToast("All data cleared", "info");
  }, [pushToast]);

  const exportCSV = useCallback(() => {
    const header = "Date,Description,Category,Amount\n";
    const rows = expenses.map(e => `${e.date},${e.description},${e.category},${e.amount}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fintrack-export.csv";
    a.click();
    URL.revokeObjectURL(url);
    pushToast("CSV exported", "success");
  }, [expenses, pushToast]);

  return { expenses, history, toasts, addExpense, deleteExpense, undoLast, clearAll, exportCSV, dismissToast };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/useExpenses.test.tsx`
Expected: PASS, 9 tests.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS, 19 tests total.

- [ ] **Step 6: Commit** — no-op (no git repository). If a repo exists: `git add src/hooks/useExpenses.ts src/hooks/useExpenses.test.tsx && git commit -m "feat: extract expense state hook with parity tests"`

---

### Task 5: Token system, base styles, pre-paint theme

**Files:**
- Modify: `src/index.css` (full rewrite)
- Modify: `index.html` (add pre-paint script)

- [ ] **Step 1: Replace `src/index.css` entirely with**

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');

@import 'tailwindcss';

@theme {
  --font-display: 'DM Sans', sans-serif;
  --font-sans: 'DM Sans', sans-serif;
  --font-mono: 'Space Mono', monospace;

  --color-surface: #FAF9F6;
  --color-surface-raised: #FFFFFF;
  --color-surface-sunken: #F1F0EA;
  --color-ink: #12211A;
  --color-ink-muted: #5C6B62;
  --color-ink-faint: #75847A;
  --color-line: rgba(18, 33, 26, 0.1);
  --color-line-strong: rgba(18, 33, 26, 0.18);
  --color-brand: #047857;
  --color-brand-strong: #065F46;
  --color-brand-soft: rgba(4, 120, 87, 0.1);
  --color-on-brand: #FFFFFF;
  --color-accent: #B45309;
  --color-accent-soft: rgba(180, 83, 9, 0.12);
  --color-info: #2563EB;
  --color-info-soft: rgba(37, 99, 235, 0.1);
  --color-danger: #DC2626;
  --color-danger-soft: rgba(220, 38, 38, 0.1);
  --color-focus: #047857;

  --radius: 12px;
}

:root[data-theme='dark'] {
  --color-surface: #0E1512;
  --color-surface-raised: #16211B;
  --color-surface-sunken: #0A100D;
  --color-ink: #E8F0EA;
  --color-ink-muted: #9DB0A4;
  --color-ink-faint: #6E8177;
  --color-line: rgba(232, 240, 234, 0.1);
  --color-line-strong: rgba(232, 240, 234, 0.18);
  --color-brand: #34D399;
  --color-brand-strong: #6EE7B7;
  --color-brand-soft: rgba(52, 211, 153, 0.12);
  --color-on-brand: #0E1512;
  --color-accent: #FBBF24;
  --color-accent-soft: rgba(251, 191, 36, 0.14);
  --color-info: #60A5FA;
  --color-info-soft: rgba(96, 165, 250, 0.14);
  --color-danger: #F87171;
  --color-danger-soft: rgba(248, 113, 113, 0.12);
  --color-focus: #34D399;
}

html, body, #root {
  height: 100%;
  font-family: var(--font-sans);
}

html, body {
  overflow-x: clip;
}

body {
  background: var(--color-surface);
  color: var(--color-ink);
  transition: background-color 200ms ease, color 200ms ease;
}

button, input, select {
  font: inherit;
}

button:focus-visible, input:focus-visible, select:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

::selection {
  background: var(--color-brand);
  color: var(--color-on-brand);
}

@keyframes overview-reveal {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

.overview-reveal {
  animation: overview-reveal 650ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes toast-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.toast-in {
  animation: toast-in 300ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.bhutan-logo {
  background: linear-gradient(135deg, #ffc72c 0 49%, #ff6a00 50% 100%);
  color: #ffffff;
}

.bhutan-logo-mark {
  color: #ffffff !important;
  text-shadow: 0 1px 1px rgba(17, 24, 18, 0.28);
}

.dzong-motif::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(45deg, var(--color-ink) 0 1px, transparent 1px 14px);
  opacity: 0.04;
  pointer-events: none;
}

.recharts-responsive-container,
.recharts-wrapper,
.recharts-surface {
  max-width: 100%;
}

.recharts-responsive-container > div {
  width: 100% !important;
}

* {
  scrollbar-width: thin;
  scrollbar-color: var(--color-ink-faint) transparent;
}

@media (max-width: 640px) {
  main {
    padding-left: 1rem !important;
    padding-right: 1rem !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .overview-reveal,
  .toast-in {
    animation: none;
  }
  * {
    transition-duration: 0.01ms !important;
  }
}
```

This deletes the `.light-brand` override block, the unused `@layer utilities`, and the hard-coded dark body background.

- [ ] **Step 2: Add the pre-paint theme script to `index.html`**

Inside `<head>`, before the module script tag, insert:

```html
    <script>
      (function () {
        var t = 'light';
        try {
          var stored = localStorage.getItem('fintrack-theme');
          if (stored === 'light' || stored === 'dark') t = stored;
          else if (window.matchMedia('(prefers-color-scheme: dark)').matches) t = 'dark';
        } catch (e) {}
        document.documentElement.dataset.theme = t;
      })();
    </script>
```

- [ ] **Step 3: Verify the app still builds**

Run: `npm run build`
Expected: exit 0. (The old `App.tsx` still references removed CSS classes; that is corrected in Tasks 6-10.)

- [ ] **Step 4: Commit** — no-op (no git repository). If a repo exists: `git add src/index.css index.html && git commit -m "feat: replace override hack with semantic token system"`

---

### Task 6: Small presentational components — TDD where cheap

**Files:**
- Create: `src/components/ThemeToggle.tsx`, `src/components/StatCard.tsx`, `src/components/ToastStack.tsx`
- Test: `src/components/ThemeToggle.test.tsx`, `src/components/StatCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

`src/components/ThemeToggle.test.tsx`:
```tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  it("announces the switch it will perform", () => {
    const onToggle = vi.fn();
    render(<ThemeToggle theme="light" onToggle={onToggle} />);
    const btn = screen.getByRole("button", { name: "Switch to dark theme" });
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("flips label and pressed state in dark mode", () => {
    render(<ThemeToggle theme="dark" onToggle={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Switch to light theme" }).getAttribute("aria-pressed")).toBe("true");
  });
});
```

`src/components/StatCard.test.tsx`:
```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="This Month" value="Nu. 1,300.00" icon="bi-calendar3" tone="brand" />);
    expect(screen.getByText("This Month")).toBeTruthy();
    expect(screen.getByText("Nu. 1,300.00")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components`
Expected: FAIL — modules missing.

- [ ] **Step 3: Create `src/components/ThemeToggle.tsx`**

```tsx
import type { Theme } from "../types";

export function ThemeToggle({ theme, onToggle, compact = false }: {
  theme: Theme;
  onToggle: () => void;
  compact?: boolean;
}) {
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={dark}
      className={`flex items-center gap-2 rounded-xl border border-line bg-surface-sunken text-ink-muted transition-colors duration-200 hover:border-line-strong hover:text-ink ${compact ? "h-9 w-9 justify-center" : "px-3 py-2 text-xs font-semibold"}`}
    >
      <i className={`bi ${dark ? "bi-sun" : "bi-moon-stars"} text-base`} aria-hidden="true" />
      {!compact && <span>{dark ? "Light" : "Dark"}</span>}
    </button>
  );
}
```

- [ ] **Step 4: Create `src/components/StatCard.tsx`**

```tsx
export type StatTone = "ink" | "brand" | "accent" | "info";

const TONE_TEXT: Record<StatTone, string> = {
  ink: "text-ink",
  brand: "text-brand",
  accent: "text-accent",
  info: "text-info",
};

const TONE_WASH: Record<StatTone, string> = {
  ink: "bg-surface-sunken",
  brand: "bg-brand-soft",
  accent: "bg-accent-soft",
  info: "bg-info-soft",
};

export function StatCard({ label, value, icon, tone }: {
  label: string;
  value: string;
  icon: string;
  tone: StatTone;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface-raised p-5 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONE_WASH[tone]}`}>
          <i className={`bi ${icon} ${TONE_TEXT[tone]}`} aria-hidden="true" />
        </span>
      </div>
      <p className={`font-mono text-2xl font-bold tracking-tight ${TONE_TEXT[tone]}`}>{value}</p>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/components/ToastStack.tsx`**

```tsx
import { useEffect } from "react";
import type { Toast } from "../types";

const STYLES: Record<Toast["type"], string> = {
  success: "border-brand/30 bg-brand-soft text-brand",
  error: "border-danger/30 bg-danger-soft text-danger",
  info: "border-info/30 bg-info-soft text-info",
};

const ICONS: Record<Toast["type"], string> = {
  success: "bi-check2-circle",
  error: "bi-x-circle",
  info: "bi-info-circle",
};

export function ToastStack({ toasts, onDismiss }: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => onDismiss(toasts[toasts.length - 1].id), 3000);
    return () => clearTimeout(timer);
  }, [toasts, onDismiss]);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-60 flex flex-col items-end gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          role="status"
          className={`toast-in pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-md ${STYLES[t.type]}`}
        >
          <i className={`bi ${ICONS[t.type]} text-lg`} aria-hidden="true" />
          <span>{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
            className="ml-1 opacity-60 transition-opacity hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- src/components`
Expected: PASS, 3 tests.

- [ ] **Step 7: Commit** — no-op (no git repository). If a repo exists: `git add src/components/ThemeToggle.tsx src/components/ThemeToggle.test.tsx src/components/StatCard.tsx src/components/StatCard.test.tsx src/components/ToastStack.tsx && git commit -m "feat: add toggle, stat card and toast components"`

---

### Task 7: Chart components

**Files:**
- Create: `src/components/TrendChart.tsx`, `src/components/CategoryDonut.tsx`, `src/components/CategoryBreakdown.tsx`

No unit tests: Recharts needs real layout; these are verified in the browser in Task 11.

- [ ] **Step 1: Create `src/components/TrendChart.tsx`**

```tsx
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatAmount } from "../format";
import type { Theme } from "../types";

const AXIS: Record<Theme, string> = { light: "#75847A", dark: "#6E8177" };
const BRAND: Record<Theme, string> = { light: "#047857", dark: "#34D399" };
const RAISED: Record<Theme, string> = { light: "#FFFFFF", dark: "#16211B" };

function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm shadow-xl">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="font-mono font-bold text-ink">{formatAmount(payload[0].value)}</p>
    </div>
  );
}

export function TrendChart({ data, theme, onAdd }: {
  data: { date: string; amount: number }[];
  theme: Theme;
  onAdd: () => void;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-65 flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-surface-sunken text-ink-muted">
        <i className="bi bi-graph-up-arrow mb-3 text-4xl" aria-hidden="true" />
        <p className="text-sm font-medium">No spending data this month</p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 text-xs font-semibold text-brand underline transition-colors hover:text-brand-strong"
        >
          Add first expense
        </button>
      </div>
    );
  }

  const brand = BRAND[theme];
  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <div role="img" aria-label={`Daily spending trend across ${data.length} days, total ${formatAmount(total)}`}>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={brand} stopOpacity={0.35} />
              <stop offset="100%" stopColor={brand} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: AXIS[theme] }} tickLine={false} axisLine={false} />
          <YAxis width={58} tick={{ fontSize: 11, fill: AXIS[theme] }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `Nu.${v}`} />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: brand, strokeOpacity: 0.25, strokeDasharray: "4 4" }} />
          <Area
            type="monotone"
            dataKey="amount"
            stroke={brand}
            strokeWidth={2.5}
            fill="url(#trendFill)"
            activeDot={{ r: 5, fill: brand, stroke: RAISED[theme], strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/CategoryDonut.tsx`**

```tsx
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CAT_COLORS } from "../data";
import { formatAmount } from "../format";
import type { Category, Theme } from "../types";

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm shadow-xl">
      <p className="font-semibold text-ink">{payload[0].name}</p>
      <p className="font-mono font-bold text-brand">{formatAmount(payload[0].value)}</p>
    </div>
  );
}

export function CategoryDonut({ data, theme }: {
  data: { name: string; value: number }[];
  theme: Theme;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-65 items-center justify-center rounded-xl bg-surface-sunken text-sm text-ink-muted">
        No data
      </div>
    );
  }

  const colors = CAT_COLORS[theme];

  return (
    <div role="img" aria-label={`Spending distributed across ${data.length} categories`}>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={4} dataKey="value" stroke="none">
            {data.map(entry => (
              <Cell key={entry.name} fill={colors[entry.name as Category] ?? colors.Other} />
            ))}
          </Pie>
          <Tooltip content={<DonutTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/CategoryBreakdown.tsx`**

```tsx
import { CAT_COLORS, CAT_ICONS } from "../data";
import { formatAmount } from "../format";
import type { Category, Theme } from "../types";

export function CategoryBreakdown({ data, total, theme }: {
  data: { name: string; value: number }[];
  total: number;
  theme: Theme;
}) {
  const colors = CAT_COLORS[theme];
  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4">
      {sorted.map((item, i) => {
        const color = colors[item.name as Category] ?? colors.Other;
        return (
          <div key={item.name} className="group flex items-center gap-3">
            <i className={`bi ${CAT_ICONS[item.name as Category] ?? "bi-pin"} text-lg text-ink-muted transition-colors group-hover:text-ink`} aria-hidden="true" />
            <div className="flex-1">
              <div className="mb-2 flex justify-between text-xs">
                <span className="font-medium text-ink-muted">{item.name}</span>
                <span className="font-mono font-semibold text-ink">{formatAmount(item.value)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%`, backgroundColor: color }}
                />
              </div>
            </div>
            <span className="w-8 text-right font-mono text-[11px] text-ink-faint">{i + 1}</span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0. (Recharts tooltip props are typed `any` deliberately, matching the existing codebase pattern.)

- [ ] **Step 5: Commit** — no-op (no git repository). If a repo exists: `git add src/components/TrendChart.tsx src/components/CategoryDonut.tsx src/components/CategoryBreakdown.tsx && git commit -m "feat: add themed chart components"`

---

### Task 8: Lists and the add-expense modal — TDD for the modal

**Files:**
- Create: `src/components/RecentList.tsx`, `src/components/TransactionTable.tsx`, `src/components/AddExpenseModal.tsx`
- Test: `src/components/AddExpenseModal.test.tsx`

- [ ] **Step 1: Write the failing test `src/components/AddExpenseModal.test.tsx`**

```tsx
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AddExpenseModal } from "./AddExpenseModal";

function submitButton() {
  return screen.getByRole("button", { name: "Add Expense" });
}

describe("AddExpenseModal", () => {
  it("shows validation errors on empty submit", () => {
    render(<AddExpenseModal onClose={vi.fn()} onAdd={vi.fn()} />);
    fireEvent.submit(submitButton());
    expect(screen.getByText("Amount must be greater than 0")).toBeTruthy();
    expect(screen.getByText("Description is required")).toBeTruthy();
  });

  it("submits a trimmed, numeric expense", () => {
    const onAdd = vi.fn();
    render(<AddExpenseModal onClose={vi.fn()} onAdd={onAdd} />);
    fireEvent.change(screen.getByLabelText("Amount (Nu.)"), { target: { value: "42.5" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "  Tea  " } });
    fireEvent.submit(submitButton());
    expect(onAdd).toHaveBeenCalledTimes(1);
    const exp = onAdd.mock.calls[0][0];
    expect(exp.amount).toBe(42.5);
    expect(exp.description).toBe("Tea");
    expect(exp.category).toBe("Food");
    expect(exp.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("rejects a zero amount", () => {
    const onAdd = vi.fn();
    render(<AddExpenseModal onClose={vi.fn()} onAdd={onAdd} />);
    fireEvent.change(screen.getByLabelText("Amount (Nu.)"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Tea" } });
    fireEvent.submit(submitButton());
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("closes on backdrop click but not on dialog click", () => {
    const onClose = vi.fn();
    render(<AddExpenseModal onClose={onClose} onAdd={vi.fn()} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/AddExpenseModal.test.tsx`
Expected: FAIL — module missing.

- [ ] **Step 3: Create `src/components/AddExpenseModal.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "../data";
import { today, uid } from "../format";
import type { Category, Expense } from "../types";

const LABEL = "mb-2 block text-[11px] font-semibold uppercase tracking-wider text-ink-muted";
const FIELD = "w-full rounded-xl border border-line bg-surface-sunken px-4 py-3 text-sm text-ink placeholder:text-ink-faint transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const FIELD_ERROR = "w-full rounded-xl border border-danger bg-surface-sunken px-4 py-3 text-sm text-ink placeholder:text-ink-faint transition-all focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/20";

export function AddExpenseModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (e: Expense) => void;
}) {
  const [form, setForm] = useState({ date: today(), amount: "", category: "Food" as Category, description: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => { amountRef.current?.focus(); }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.amount || Number(form.amount) <= 0) errs.amount = "Amount must be greater than 0";
    if (!form.description.trim()) errs.description = "Description is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onAdd({
      id: uid(),
      date: form.date,
      amount: Number(form.amount),
      category: form.category,
      description: form.description.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-expense-title"
        className="w-full max-w-md rounded-3xl border border-line bg-surface-raised shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line p-6">
          <div>
            <h2 id="add-expense-title" className="text-lg font-bold text-ink">Add Expense</h2>
            <p className="mt-0.5 text-xs text-ink-muted">Record a new transaction</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-sunken text-ink-muted transition-colors hover:text-ink"
          >
            <i className="bi bi-x-lg text-xs" aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-5 p-6">
          <div>
            <label htmlFor="exp-date" className={LABEL}>Date</label>
            <input
              id="exp-date"
              type="date"
              value={form.date}
              max={today()}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className={FIELD}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="exp-amount" className={LABEL}>Amount (Nu.)</label>
              <input
                id="exp-amount"
                ref={amountRef}
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className={errors.amount ? FIELD_ERROR : FIELD}
              />
              {errors.amount && <p className="mt-1.5 text-xs text-danger">{errors.amount}</p>}
            </div>
            <div>
              <label htmlFor="exp-category" className={LABEL}>Category</label>
              <select
                id="exp-category"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}
                className={FIELD}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="exp-description" className={LABEL}>Description</label>
            <input
              id="exp-description"
              type="text"
              placeholder="What was this for?"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className={errors.description ? FIELD_ERROR : FIELD}
            />
            {errors.description && <p className="mt-1.5 text-xs text-danger">{errors.description}</p>}
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-brand py-3.5 font-bold text-on-brand shadow-lg shadow-brand/25 transition-colors hover:bg-brand-strong"
          >
            Add Expense
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/AddExpenseModal.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Create `src/components/RecentList.tsx`**

```tsx
import { CAT_ICONS } from "../data";
import { formatAmount, formatDate } from "../format";
import type { Expense } from "../types";

export function RecentList({ items, onDelete, onViewAll }: {
  items: Expense[];
  onDelete: (id: string) => void;
  onViewAll: () => void;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface-raised p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-ink">Recent</h3>
        <button
          type="button"
          onClick={onViewAll}
          className="flex items-center gap-1 text-xs font-semibold text-brand transition-colors hover:text-brand-strong"
        >
          View all <i className="bi bi-chevron-right" aria-hidden="true" />
        </button>
      </div>
      <ul className="space-y-1">
        {items.map(exp => (
          <li key={exp.id} className="group flex items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-surface-sunken">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-sunken text-ink-muted transition-colors group-hover:text-ink">
                <i className={`bi ${CAT_ICONS[exp.category]}`} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{exp.description}</p>
                <p className="mt-0.5 text-[10px] text-ink-faint">{formatDate(exp.date)} · {exp.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-brand">-{formatAmount(exp.amount)}</span>
              <button
                type="button"
                onClick={() => onDelete(exp.id)}
                aria-label={`Delete ${exp.description}`}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-danger-soft text-danger opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              >
                <i className="bi bi-trash3 text-xs" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="py-8 text-center text-sm text-ink-muted">No expenses yet</li>}
      </ul>
    </section>
  );
}
```

- [ ] **Step 6: Create `src/components/TransactionTable.tsx`**

```tsx
import { CAT_ICONS } from "../data";
import { formatAmount, formatDate } from "../format";
import type { Expense } from "../types";

export function TransactionTable({ items, onDelete, total }: {
  items: Expense[];
  onDelete: (id: string) => void;
  total: number;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface-raised">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h3 className="font-semibold text-ink">All Transactions</h3>
        <span className="rounded-full bg-surface-sunken px-3 py-1 text-xs text-ink-muted">{items.length} records</span>
      </div>
      <div className="hidden grid-cols-[1fr_140px_100px_140px_40px] gap-4 border-b border-line px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint md:grid">
        <span>Description</span>
        <span>Category</span>
        <span>Date</span>
        <span className="text-right">Amount</span>
        <span />
      </div>
      <ul className="divide-y divide-line">
        {items.map(exp => (
          <li key={exp.id} className="group grid grid-cols-[1fr_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-sunken md:grid-cols-[1fr_140px_100px_140px_40px]">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-ink-muted">
                <i className={`bi ${CAT_ICONS[exp.category]} text-lg`} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{exp.description}</p>
                <p className="mt-0.5 text-[10px] text-ink-faint md:hidden">{formatDate(exp.date)} · {exp.category}</p>
              </div>
            </div>
            <span className="hidden md:block">
              <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] text-ink-muted">{exp.category}</span>
            </span>
            <span className="hidden text-xs text-ink-faint md:block">{formatDate(exp.date)}</span>
            <span className="text-right font-mono text-sm font-bold text-brand">-{formatAmount(exp.amount)}</span>
            <button
              type="button"
              onClick={() => onDelete(exp.id)}
              aria-label={`Delete ${exp.description}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger md:opacity-70 md:group-hover:opacity-100"
            >
              <i className="bi bi-trash3 text-sm" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <div className="flex h-48 items-center justify-center text-sm text-ink-muted">No transactions found</div>
      )}
      {items.length > 0 && (
        <div className="flex items-center justify-between border-t border-line bg-surface-sunken px-6 py-4">
          <span className="text-sm font-medium text-ink-muted">Total</span>
          <span className="font-mono text-xl font-bold text-ink">{formatAmount(total)}</span>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 7: Type-check and run suite**

Run: `npx tsc --noEmit && npm test`
Expected: exit 0, 26 tests pass.

- [ ] **Step 8: Commit** — no-op (no git repository). If a repo exists: `git add src/components/RecentList.tsx src/components/TransactionTable.tsx src/components/AddExpenseModal.tsx src/components/AddExpenseModal.test.tsx && git commit -m "feat: add lists and validated add-expense modal"`

---

### Task 9: Shell components (sidebar, mobile bar, hero)

**Files:**
- Create: `src/components/Sidebar.tsx`, `src/components/MobileBar.tsx`, `src/components/HeroPanel.tsx`

- [ ] **Step 1: Create `src/components/Sidebar.tsx`**

```tsx
import { VIEW_NAV } from "../data";
import type { Theme, View } from "../types";
import { ThemeToggle } from "./ThemeToggle";

export function Sidebar({ view, onView, onAdd, onExport, onUndo, canUndo, onClearAll, theme, onToggleTheme }: {
  view: View;
  onView: (v: View) => void;
  onAdd: () => void;
  onExport: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onClearAll: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface-raised lg:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="bhutan-logo flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] shadow-md">
          <span className="bhutan-logo-mark flex items-center gap-0.5 text-[11px] font-bold tracking-tight">
            Nu <i className="bi bi-stars text-[9px]" aria-hidden="true" />
          </span>
        </div>
        <div>
          <p className="text-base font-bold tracking-tight text-ink">FinTrack</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-ink-faint">Expense manager</p>
        </div>
      </div>
      <nav aria-label="Primary" className="mt-2 flex flex-col gap-1 px-3">
        {VIEW_NAV.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => onView(item.id)}
            aria-current={view === item.id ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${view === item.id ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-surface-sunken hover:text-ink"}`}
          >
            <i className={`bi ${item.icon}`} aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="mt-6 px-3">
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-on-brand transition-colors hover:bg-brand-strong"
        >
          <i className="bi bi-plus-lg" aria-hidden="true" /> Add Expense
        </button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onExport}
            className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface-sunken px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <i className="bi bi-download" aria-hidden="true" /> Export
          </button>
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface-sunken px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <i className="bi bi-arrow-counterclockwise" aria-hidden="true" /> Undo
          </button>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line px-4 py-4">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <button
          type="button"
          onClick={onClearAll}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <i className="bi bi-trash3" aria-hidden="true" /> Clear all
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create `src/components/MobileBar.tsx`**

```tsx
import { VIEW_NAV } from "../data";
import type { Theme, View } from "../types";
import { ThemeToggle } from "./ThemeToggle";

export function MobileBar({ view, onView, onAdd, onExport, onUndo, canUndo, onClearAll, theme, onToggleTheme }: {
  view: View;
  onView: (v: View) => void;
  onAdd: () => void;
  onExport: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onClearAll: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-line bg-surface-raised/95 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="bhutan-logo flex h-9 w-9 items-center justify-center rounded-xl">
            <span className="bhutan-logo-mark flex items-center gap-0.5 text-[10px] font-bold">
              Nu <i className="bi bi-stars text-[8px]" aria-hidden="true" />
            </span>
          </div>
          <p className="text-base font-bold tracking-tight text-ink">FinTrack</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add expense"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-on-brand transition-colors hover:bg-brand-strong"
          >
            <i className="bi bi-plus-lg" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="flex gap-1 px-4 pb-3">
        {VIEW_NAV.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => onView(item.id)}
            aria-current={view === item.id ? "page" : undefined}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${view === item.id ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-surface-sunken hover:text-ink"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 px-4 pb-3">
        <button
          type="button"
          onClick={onExport}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-surface-sunken px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
        >
          <i className="bi bi-download" aria-hidden="true" /> Export
        </button>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-surface-sunken px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <i className="bi bi-arrow-counterclockwise" aria-hidden="true" /> Undo
        </button>
        <button
          type="button"
          onClick={onClearAll}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-surface-sunken px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <i className="bi bi-trash3" aria-hidden="true" /> Clear
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/HeroPanel.tsx`**

```tsx
import { formatAmount } from "../format";

export function HeroPanel({ total, monthLabel, count, onAdd, onExport }: {
  total: number;
  monthLabel: string;
  count: number;
  onAdd: () => void;
  onExport: () => void;
}) {
  return (
    <section className="dzong-motif overview-reveal relative overflow-hidden rounded-3xl border border-line bg-surface-raised p-8">
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">Total spent · {monthLabel}</p>
          <p className="mt-3 font-mono text-4xl font-bold tracking-tight text-ink sm:text-5xl">{formatAmount(total)}</p>
          <p className="mt-3 text-sm text-ink-muted">{count} {count === 1 ? "expense" : "expenses"} recorded</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-on-brand shadow-lg shadow-brand/25 transition-colors hover:bg-brand-strong"
          >
            <i className="bi bi-plus-lg" aria-hidden="true" /> Add Expense
          </button>
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface-sunken px-5 py-3 text-sm font-semibold text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <i className="bi bi-download" aria-hidden="true" /> Export CSV
          </button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit** — no-op (no git repository). If a repo exists: `git add src/components/Sidebar.tsx src/components/MobileBar.tsx src/components/HeroPanel.tsx && git commit -m "feat: add sidebar, mobile bar and hero shell"`

---

### Task 10: App composition

**Files:**
- Modify: `src/App.tsx` (full rewrite — replaces all 601 lines)

- [ ] **Step 1: Replace `src/App.tsx` entirely with**

```tsx
import { useEffect, useMemo, useState } from "react";
import { AddExpenseModal } from "./components/AddExpenseModal";
import { CategoryBreakdown } from "./components/CategoryBreakdown";
import { CategoryDonut } from "./components/CategoryDonut";
import { HeroPanel } from "./components/HeroPanel";
import { MobileBar } from "./components/MobileBar";
import { RecentList } from "./components/RecentList";
import { Sidebar } from "./components/Sidebar";
import { StatCard } from "./components/StatCard";
import { ToastStack } from "./components/ToastStack";
import { TransactionTable } from "./components/TransactionTable";
import { TrendChart } from "./components/TrendChart";
import { CATEGORIES, MONTH_LABEL, MONTH_PREFIX, TREND_START } from "./data";
import { formatAmount } from "./format";
import { useExpenses } from "./hooks/useExpenses";
import { useTheme } from "./hooks/useTheme";
import type { Category, View } from "./types";

const CARD = "rounded-2xl border border-line bg-surface-raised p-6";

export default function App() {
  const { expenses, history, toasts, addExpense, deleteExpense, undoLast, clearAll, exportCSV, dismissToast } = useExpenses();
  const { theme, toggleTheme } = useTheme();
  const [view, setView] = useState<View>("dashboard");
  const [showModal, setShowModal] = useState(false);
  const [filterCat, setFilterCat] = useState<Category | "All">("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setShowModal(true); }
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) { e.preventDefault(); undoLast(); }
      if (e.key === "Escape") setShowModal(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undoLast]);

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      const matchCat = filterCat === "All" || e.category === filterCat;
      const matchSearch = search === "" || e.description.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [expenses, filterCat, search]);

  const filteredTotal = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  const stats = useMemo(() => {
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const thisMonth = expenses.filter(e => e.date.startsWith(MONTH_PREFIX)).reduce((s, e) => s + e.amount, 0);
    const avg = expenses.length > 0 ? Math.round(total / expenses.length) : 0;
    const top = Object.entries(
      expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {} as Record<string, number>),
    ).sort((a, b) => b[1] - a[1])[0];
    return { total, thisMonth, avg, topCat: top?.[0] || "—" };
  }, [expenses]);

  const dailyData = useMemo(() => {
    const days: Record<string, number> = {};
    expenses.filter(e => e.date >= TREND_START).forEach(e => { days[e.date] = (days[e.date] || 0) + e.amount; });
    return Object.entries(days).map(([date, amount]) => ({ date: date.slice(5), amount }));
  }, [expenses]);

  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const shellProps = {
    view,
    onView: setView,
    onAdd: () => setShowModal(true),
    onExport: exportCSV,
    onUndo: undoLast,
    canUndo: history.length > 0,
    onClearAll: clearAll,
    theme,
    onToggleTheme: toggleTheme,
  };

  const topSlice = [...pieData].sort((a, b) => b.value - a.value)[0];

  return (
    <div className="min-h-screen bg-surface text-ink">
      <Sidebar {...shellProps} />
      <MobileBar {...shellProps} />
      <main className="lg:pl-60">
        <div className="mx-auto max-w-[1160px] space-y-6 px-4 py-6 sm:px-6 lg:py-8">
          {view === "dashboard" && (
            <>
              <HeroPanel
                total={stats.total}
                monthLabel={MONTH_LABEL}
                count={expenses.length}
                onAdd={() => setShowModal(true)}
                onExport={exportCSV}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="This Month" value={formatAmount(stats.thisMonth)} icon="bi-calendar3" tone="brand" />
                <StatCard label="Top Category" value={stats.topCat} icon="bi-trophy" tone="accent" />
                <StatCard label="Avg. Entry" value={formatAmount(stats.avg)} icon="bi-bar-chart-line" tone="info" />
                <StatCard label="Transactions" value={String(expenses.length)} icon="bi-receipt" tone="ink" />
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <section className={`${CARD} min-w-0 lg:col-span-2`}>
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-ink">Spending Trend</h3>
                      <p className="mt-0.5 text-xs text-ink-muted">Daily expenses this month</p>
                    </div>
                    <span className="flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3 py-1.5 text-xs text-brand">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                      Live Tracking
                    </span>
                  </div>
                  <TrendChart data={dailyData} theme={theme} onAdd={() => setShowModal(true)} />
                </section>
                <section className={`${CARD} min-w-0`}>
                  <div className="mb-6">
                    <h3 className="text-base font-semibold text-ink">By Category</h3>
                    <p className="mt-0.5 text-xs text-ink-muted">Expense distribution</p>
                  </div>
                  <CategoryDonut data={pieData} theme={theme} />
                </section>
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <section className={`${CARD} min-w-0 lg:col-span-3`}>
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-ink">Category Breakdown</h3>
                    <span className="rounded-full bg-surface-sunken px-3 py-1 text-[11px] text-ink-muted">
                      {stats.total > 0 && topSlice
                        ? `Top: ${topSlice.name} at ${Math.round((topSlice.value / stats.total) * 100)}%`
                        : "No data"}
                    </span>
                  </div>
                  <CategoryBreakdown data={pieData} total={stats.total} theme={theme} />
                </section>
                <div className="min-w-0 lg:col-span-2">
                  <RecentList items={expenses.slice(0, 5)} onDelete={deleteExpense} onViewAll={() => setView("transactions")} />
                </div>
              </div>
            </>
          )}

          {view === "transactions" && (
            <>
              <div className="rounded-2xl border border-line bg-surface-raised p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-50 flex-1">
                    <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint" aria-hidden="true" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      aria-label="Search transactions"
                      className="w-full rounded-xl border border-line bg-surface-sunken py-3 pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {["All", ...CATEGORIES].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFilterCat(cat as Category | "All")}
                        aria-pressed={filterCat === cat}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${filterCat === cat ? "border-brand/30 bg-brand-soft text-brand" : "border-line bg-surface-sunken text-ink-muted hover:text-ink"}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <TransactionTable items={filtered} onDelete={deleteExpense} total={filteredTotal} />
            </>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-xs text-ink-muted">
            <p>
              © 2026 FinTrack · <span className="font-medium text-ink">Ctrl+N</span> new expense ·{" "}
              <span className="font-medium text-ink">Ctrl+Z</span> undo last · <span className="font-medium text-ink">Esc</span> close dialog
            </p>
          </footer>
        </div>
      </main>

      {showModal && <AddExpenseModal onClose={() => setShowModal(false)} onAdd={addExpense} />}
      {toasts.length > 0 && <ToastStack toasts={toasts} onDismiss={dismissToast} />}
    </div>
  );
}
```

- [ ] **Step 2: Type-check and full suite**

Run: `npx tsc --noEmit && npm test`
Expected: exit 0, 26 tests pass.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 4: Commit** — no-op (no git repository). If a repo exists: `git add src/App.tsx && git commit -m "feat: compose token-driven app shell"`

---

### Task 11: Verification matrix, docs, cleanup

**Files:**
- Modify: `AGENTS.md` (project structure + commands)
- No source changes unless a check below fails; fix in place and re-run.

- [ ] **Step 1: Run the full gate**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: all exit 0.

- [ ] **Step 2: Browser verification at desktop width (≥1280px), light theme**

Open the dev server URL. Confirm: sidebar visible with Nu logo; hero shows `Nu. 1,300.00`; four stat tiles; area chart draws a visible green line and gradient; donut shows 7 sectors; breakdown bars ranked Shopping first; Recent lists 5 rows; no white-on-white or pale-on-pale text anywhere.

- [ ] **Step 3: Toggle to dark theme and reload**

Confirm: every surface flips (page `#0E1512`, cards `#16211B`), chart line becomes mint `#34D399`, category colors switch to the bright set, preference survives the reload (`document.documentElement.dataset.theme === "dark"`).

- [ ] **Step 4: Feature pass in the browser (both themes)**

- Add expense via sidebar button and via Ctrl+N: modal opens, amount autofocused; submit empty → both errors; submit valid → toast "… added", hero total increases.
- Delete a row in Transactions → toast "Transaction removed"; Undo button and Ctrl+Z restore it.
- Search "gro" → one row; chip "Food" + search "" → 4 rows; footer total matches the visible rows.
- Export CSV → download starts, file begins with `Date,Description,Category,Amount`.
- Clear all → empty states render; then in DevTools clear `fintrack-expenses`/`fintrack-history` and reload → 12 seed rows return.
- Esc closes an open modal.

- [ ] **Step 5: Mobile pass at 390px width**

Confirm: sidebar hidden; top bar with logo, theme toggle, add button; two tabs switch views; action row shows Export/Undo/Clear; transaction rows show date · category under the description; no horizontal scroll.

- [ ] **Step 6: Contrast spot-check**

In both themes verify: `text-ink-muted` on `surface-raised`, `text-brand` on `surface-raised`, `text-on-brand` on `brand`, and `text-ink-faint` on `surface` all read clearly (AA). Fix token values in `src/index.css` if any pair looks washed out, then re-run Step 1.

- [ ] **Step 7: Update AGENTS.md**

Replace the "Project Structure" bullet list with the new layout:
```markdown
- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Composition only: view state, filters, keyboard shortcuts, layout shell
- `src/types.ts` - Shared types (Category, Expense, Toast, Theme, View)
- `src/data.ts` - Categories, icons, per-theme colors, seed data, storage keys, nav config
- `src/format.ts` - Date/amount (Nu.) formatting and localStorage helpers
- `src/hooks/useExpenses.ts` - Expense state, persistence, add/delete/undo/clear/export, toasts
- `src/hooks/useTheme.ts` - Persisted light/dark theme synced to `<html data-theme>`
- `src/components/` - Sidebar, MobileBar, HeroPanel, StatCard, TrendChart, CategoryDonut, CategoryBreakdown, RecentList, TransactionTable, AddExpenseModal, ToastStack, ThemeToggle
- `src/index.css` - Tailwind v4 theme tokens (light defaults + `[data-theme="dark"]` overrides) and base styles
```
and add to Commands:
```markdown
- `test` — Run Vitest suite once
- `test:watch` — Run Vitest in watch mode
```

- [ ] **Step 8: Final gate and commit**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: exit 0. Commit — no-op (no git repository). If a repo exists: `git add AGENTS.md && git commit -m "docs: reflect component architecture and test commands"`
