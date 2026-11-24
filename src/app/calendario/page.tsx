import type { Metadata } from "next";
import { Terminal } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ContentCalendar } from "@/components/calendario/content-calendar";
import { Badge } from "@/components/ui/badge";
import { calendarEntries } from "@/lib/data/calendar";
import { getNavItem } from "@/lib/nav";

const item = getNavItem("/calendario");
export const metadata: Metadata = { title: item.title };

export default function CalendarioPage() {
  const fromScript = calendarEntries.filter((e) => e.fromScript).length;
  return (
    <>
      <PageHeader
        item={item}
        actions={
          <Badge variant="accent" className="gap-1.5 py-1">
            <Terminal /> {fromScript} de {calendarEntries.length} entradas geradas pelo /script
          </Badge>
        }
      />
      <ContentCalendar entries={calendarEntries} />
    </>
  );
}
