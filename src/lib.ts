import type { CSSProperties } from "react";
import type { Category } from "./types";

export const CATEGORIES: Category[] = ["Food", "Transport", "Entertainment", "Shopping", "Health", "Education", "Utilities", "Other"];

export const CAT_COLORS: Record<Category, string> = {
  Food: "#f97316", Transport: "#3b82f6", Entertainment: "#a855f7",
  Shopping: "#fbbf24", Health: "#f87171", Education: "#a3e635",
  Utilities: "#f6ad55", Other: "#6b7a8c",
};

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

export function today(): string { return new Date().toISOString().slice(0, 10); }
export function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
export function formatAmount(n: number): string { return `Nu. ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`; }
export function uid(): string { return Math.random().toString(36).slice(2, 10); }

export function categoryMarkStyle(cat: string): CSSProperties {
  const color = CAT_COLORS[cat as Category] ?? "#f97316";
  return { color, backgroundColor: `${color}20`, border: `1px solid ${color}40` };
}
