import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const compact = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCompact(n: number) {
  return compact.format(n);
}

export function formatPct(n: number, digits = 1) {
  return `${n > 0 ? "+" : ""}${n.toFixed(digits).replace(".", ",")}%`;
}
