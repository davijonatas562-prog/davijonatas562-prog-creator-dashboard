import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PageTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function Section({ title, description, children, danger }: { title: string; description?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <Card className={cn("grid gap-6 p-5 md:grid-cols-[260px_1fr] md:p-6", danger && "border-negative/30")}>
      <div>
        <h2 className={cn("text-sm font-semibold", danger && "text-negative")}>{title}</h2>
        {description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </Card>
  );
}
