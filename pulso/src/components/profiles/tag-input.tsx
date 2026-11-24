"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Campo de etiquetas: Enter ou vírgula adiciona; Backspace no campo vazio remove a última. */
export function TagInput({
  id,
  value,
  onChange,
  placeholder,
  tone = "default",
  disabled,
}: {
  id: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  tone?: "default" | "context" | "exclude";
  disabled?: boolean;
}) {
  const [draft, setDraft] = React.useState("");
  const add = (raw: string) => {
    const parts = raw.split(/[,;\n]/).map((p) => p.trim()).filter((p) => p.length >= 2);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p.slice(0, 120));
    onChange(next);
    setDraft("");
  };
  return (
    <div
      className={cn(
        "flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background/60 px-2 py-1.5 transition-[box-shadow,border-color] focus-within:border-primary/70 focus-within:ring-[3px] focus-within:ring-primary/15",
        disabled && "opacity-60",
      )}
    >
      {value.map((v) => (
        <span
          key={v}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs",
            tone === "exclude" ? "border-negative/30 bg-negative/10 text-negative" : tone === "context" ? "border-info/30 bg-info/10 text-info" : "border-primary/30 bg-primary/10 text-primary",
          )}
        >
          {v}
          {!disabled && (
            <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`Remover ${v}`} className="opacity-70 hover:opacity-100">
              <X className="size-3" />
            </button>
          )}
        </span>
      ))}
      <input
        id={id}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => draft && add(draft)}
        onPaste={(e) => {
          const t = e.clipboardData.getData("text");
          if (/[,;\n]/.test(t)) {
            e.preventDefault();
            add(t);
          }
        }}
        placeholder={value.length ? "" : placeholder}
        className="min-w-[140px] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground/70"
      />
    </div>
  );
}
