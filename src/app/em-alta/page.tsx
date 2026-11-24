import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { NewsFeed } from "@/components/em-alta/news-feed";
import { Badge } from "@/components/ui/badge";
import { newsItems, newsSources } from "@/lib/data/trending";
import { getNavItem } from "@/lib/nav";

const item = getNavItem("/em-alta");
export const metadata: Metadata = { title: item.title };

export default function EmAltaPage() {
  const strong = newsItems.filter((n) => n.hookScore >= 85).length;
  return (
    <>
      <PageHeader
        item={item}
        actions={
          <>
            <Badge variant="outline">{newsSources.length} fontes</Badge>
            <Badge>{strong} hooks fortes hoje</Badge>
          </>
        }
      />
      <NewsFeed items={newsItems} sources={newsSources} />
    </>
  );
}
