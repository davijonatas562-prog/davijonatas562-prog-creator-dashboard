import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="flex flex-col gap-5" aria-busy>
      <Skeleton className="h-6 w-40" />
      <Card className="grid gap-3 p-4">
        <Skeleton className="h-10" />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </Card>
      {Array.from({ length: 4 }, (_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </Card>
      ))}
    </div>
  );
}
