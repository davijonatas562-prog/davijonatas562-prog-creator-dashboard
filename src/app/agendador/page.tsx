import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Scheduler } from "@/components/agendador/scheduler";
import { scheduledPosts } from "@/lib/data/scheduler";
import { getNavItem } from "@/lib/nav";

const item = getNavItem("/agendador");
export const metadata: Metadata = { title: item.title };

export default function AgendadorPage() {
  return (
    <>
      <PageHeader item={item} />
      <Scheduler initialPosts={scheduledPosts} />
    </>
  );
}
