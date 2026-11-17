import type { ApiExpense } from "./api";

export type Category =
  | "Food" | "Transport" | "Entertainment" | "Shopping"
  | "Health" | "Education" | "Utilities" | "Other";

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

export interface Insight {
  icon: string;
  variant: "mint" | "warning" | "neutral";
  title: string;
  text: string;
}

// The backend stores expenses as ApiExpense; the shape matches Expense
// (category is a plain string there), so conversion is a safe cast.
export function fromApi(e: ApiExpense): Expense {
  return e as unknown as Expense;
}
