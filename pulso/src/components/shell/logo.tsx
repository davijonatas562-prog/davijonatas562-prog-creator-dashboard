import Link from "next/link";
import { cn } from "@/lib/utils";

/** Marca: um traço de pulso dentro de um quadrado arredondado. */
export function Logo({ href = "/", className, compact = false }: { href?: string; className?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label="PULSO — início">
      <span className="relative flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 shadow-[0_6px_20px_-8px_var(--primary)]">
        <svg viewBox="0 0 24 24" className="size-[18px] text-primary-foreground" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2 12h4l2.5-6 4 12 3-9 1.5 3H22" />
        </svg>
      </span>
      {!compact && <span className="text-[15px] font-semibold tracking-[0.18em] text-foreground">PULSO</span>}
    </Link>
  );
}
