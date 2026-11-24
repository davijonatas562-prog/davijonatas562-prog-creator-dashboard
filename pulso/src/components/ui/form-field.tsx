import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Rótulo + controle + mensagem de erro, ligados por id para leitores de tela. */
export function FormField({
  id,
  label,
  error,
  hint,
  className,
  children,
  aside,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-negative">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
