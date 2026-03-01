import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number, currency: "HNL" | "USD") {
  const locale = currency === "HNL" ? "es-HN" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2
  }).format(amount);
}

export function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}
