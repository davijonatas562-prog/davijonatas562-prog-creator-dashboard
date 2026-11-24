import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat("pt-BR");

/** 2.400.000 → "2,4 mi" */
export function formatCompact(n: number) {
  return compact.format(n);
}

export function formatInt(n: number) {
  return integer.format(n);
}

/** 0.123 → "+12,3%" (com sinal quando `signed`) */
export function formatPct(ratio: number, { signed = false, digits = 1 } = {}) {
  const v = (ratio * 100).toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  return `${signed && ratio > 0 ? "+" : ""}${v}%`;
}

/** variação relativa; null quando a base é zero */
export function relativeChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
