/**
 * Teru Care Java backend client.
 *
 * All data lives in the Java backend (BST + HashTable + Stack + MergeSort)
 * which persists to backend/data/expenses.json. The React app is purely a
 * view: every add / delete / undo / clear goes through these calls.
 *
 * The backend must be running: backend\run.bat (listens on port 8090)
 * In dev/preview the requests hit this same origin and Vite's /api proxy
 * (vite.config.ts) forwards them to the backend, so no CORS is involved.
 * Override the URL with VITE_API_URL when running against a different host
 * (e.g. the deployed API URL on Vercel, including the /api suffix).
 */

const API_BASE: string = import.meta.env.VITE_API_URL ?? "/api";

export interface ApiExpense {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  note?: string;
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the Java backend — is it running? Start it with backend\\run.bat");
  }
  let body: unknown = null;
  try { body = await res.json(); } catch { /* 204 responses */ }
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `Request failed (${res.status})`;
    throw new ApiError(message);
  }
  return body as T;
}

export interface ExpenseListResponse {
  expenses: ApiExpense[];
  canUndo: boolean;
}

export interface UndoResponse {
  action: "restored" | "removed" | "skipped";
  expense: ApiExpense;
  canUndo: boolean;
}

export function fetchExpenses(): Promise<ExpenseListResponse> {
  return request<ExpenseListResponse>("/expenses");
}

export function addExpense(expense: Omit<ApiExpense, "id"> & { id?: string }): Promise<ApiExpense> {
  return request<{ expense: ApiExpense }>("/expenses", {
    method: "POST",
    body: JSON.stringify(expense),
  }).then(r => r.expense);
}

export function deleteExpense(id: string): Promise<ApiExpense> {
  return request<{ expense: ApiExpense }>(`/expenses/${encodeURIComponent(id)}`, { method: "DELETE" })
    .then(r => r.expense);
}

export function undoLast(): Promise<UndoResponse> {
  return request<UndoResponse>("/undo", { method: "POST" });
}

export function clearAllExpenses(): Promise<void> {
  return request<{ cleared: boolean }>("/expenses", { method: "DELETE" }).then(() => undefined);
}
