import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function DashboardSkeleton({ withHeader = true }: { withHeader?: boolean }) {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Carregando dashboard">
      {withHeader && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-full" />
            <div className="grid gap-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
          <Skeleton className="h-9 w-80" />
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="h-[420px] p-5 lg:col-span-4 lg:row-span-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mx-auto mt-10 h-28 w-56 rounded-t-full" />
          <Skeleton className="mx-auto mt-8 h-6 w-40 rounded-full" />
        </Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:col-span-8">
          {Array.from({ length: 6 }, (_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-4 h-7 w-20" />
              <Skeleton className="mt-3 h-3 w-28" />
            </Card>
          ))}
        </div>
        <Card className="h-[190px] p-5 lg:col-span-8">
          <Skeleton className="h-3 w-32" />
          <div className="mt-5 grid gap-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="h-[320px] p-5 lg:col-span-8">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-6 h-[220px]" />
        </Card>
        <Card className="h-[320px] p-5 lg:col-span-4">
          <Skeleton className="h-3 w-32" />
          <div className="mt-6 grid gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-3" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
