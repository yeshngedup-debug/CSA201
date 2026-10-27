/**
 * Teru Care Java backend client.
 *
 * All data now lives in the Java backend (BST + HashTable + Stack + MergeSort)
 * which persists to backend/data/expenses.json. The React app is purely a
 * view: every add / delete / undo / clear goes through these calls.
 *
 * The backend must be running:  backend\run.bat   (listens on port 8090)
 * Override the URL with VITE_API_URL when deploying elsewhere.
 */

const API_BASE: string = import.meta.env.VITE_API_URL ?? "http://localhost:8090/api";

export interface ApiExpense {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  note?: string;
}

/** Error carrying the backend's message, ready to show in a toast. */
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
  try {
    body = await res.json();
  } catch {
    // 204 responses arrive with an empty body
  }

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

/** All expenses, newest first (reverse in-order traversal of the backend BST). */
export function fetchExpenses(): Promise<ExpenseListResponse> {
  return request<ExpenseListResponse>("/expenses");
}

export function fetchExpensesRange(from: string, to: string, category?: string): Promise<{ expenses: ApiExpense[]; from?: string; to?: string; category?: string }> {
  const qs = new URLSearchParams();
  if (from) qs.append("from", from);
  if (to) qs.append("to", to);
  if (category) qs.append("category", category);
  const q = qs.toString() ? "?" + qs.toString() : "";
  return request(`/expenses/range${q}`);
}

export function fetchStats(): Promise<Record<string, unknown>> {
  return request("/stats");
}

export function fetchExportCsv(): Promise<string> {
  return fetch(`${API_BASE}/expenses/export`, { headers: { "Accept": "text/csv" } })
    .then(async res => { if (!res.ok) throw new ApiError("Export failed"); return res.text(); });
}

export function searchExpenses(q: string): Promise<ExpenseListResponse> {
  return request<ExpenseListResponse>(`/expenses?q=${encodeURIComponent(q)}`);
}

/** Validate + add on the Java side; returns the stored expense (with server id). */
export function addExpense(expense: Omit<ApiExpense, "id"> & { id?: string }): Promise<ApiExpense> {
  return request<{ expense: ApiExpense }>("/expenses", {
    method: "POST",
    body: JSON.stringify(expense),
  }).then(r => r.expense);
}

export function deleteExpense(id: string): Promise<ApiExpense> {
  return request<{ expense: ApiExpense }>(`/expenses/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).then(r => r.expense);
}

/** Pop the backend undo Stack: removes the last add, or restores the last delete. */
export function undoLast(): Promise<UndoResponse> {
  return request<UndoResponse>("/undo", { method: "POST" });
}

export function clearAllExpenses(): Promise<void> {
  return request<{ cleared: boolean }>("/expenses", { method: "DELETE" }).then(() => undefined);
}
