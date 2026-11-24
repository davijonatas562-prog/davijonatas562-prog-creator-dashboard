import { MentionsFeed } from "@/components/mentions/mentions-feed";
import { DEMO_PROFILES, generateDemoItems } from "@/lib/demo/data";
import { filterInMemory, parseMentionFilters, PAGE_SIZE } from "@/lib/mentions/filters";

export const metadata = { title: "Menções · Demonstração" };

export default async function DemoMentionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const now = new Date();
  const all = generateDemoItems(now);
  const filters = parseMentionFilters(sp, now);
  const { items, total } = filterInMemory(all, filters);
  const topics = [...new Set(all.map((m) => m.topic).filter((t): t is string => !!t))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const unclassified = all.filter((m) => !m.analysis && new Date(m.publishedAt) >= filters.period.start).length;
  return (
    <MentionsFeed
      mode="demo"
      items={items}
      total={total}
      page={filters.page}
      pageSize={PAGE_SIZE}
      topics={topics}
      profiles={DEMO_PROFILES}
      profileId={DEMO_PROFILES[0].id}
      unclassified={unclassified}
      canWork
      aiConfigured
    />
  );
}
