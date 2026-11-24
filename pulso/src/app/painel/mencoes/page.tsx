import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { MentionsFeed } from "@/components/mentions/mentions-feed";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireOrg } from "@/lib/data/session";
import { listProfiles } from "@/lib/data/dashboard";
import { countUnclassified, listMentions, listTopics } from "@/lib/data/mentions";
import { parseMentionFilters, PAGE_SIZE } from "@/lib/mentions/filters";
import { isSentimentConfigured } from "@/lib/sentiment/classify";
import { addManualMention, classifyPending, correctMentionSentiment, setMentionStatus, toggleSavedMention } from "./actions";

export const metadata: Metadata = { title: "Menções" };

export default async function MentionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const ctx = await requireOrg();
  const profiles = await listProfiles(ctx.org.id);
  if (!profiles.length) {
    return (
      <Card className="flex flex-col items-center px-6 py-16 text-center">
        <UserPlus className="size-6 text-primary" />
        <h1 className="mt-4 text-lg font-semibold">Cadastre um perfil para ver menções</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">As menções são sempre ligadas a um político monitorado.</p>
        <Button asChild className="mt-6">
          <Link href="/painel/perfis/novo">Adicionar político</Link>
        </Button>
      </Card>
    );
  }
  const profile = profiles.find((p) => p.id === sp.perfil) ?? profiles.find((p) => p.status === "active") ?? profiles[0];
  const filters = parseMentionFilters(sp, new Date());
  const [{ items, total }, topics, unclassified] = await Promise.all([
    listMentions(profile.id, ctx.user.id, filters),
    listTopics(ctx.org.id),
    countUnclassified(profile.id),
  ]);
  return (
    <MentionsFeed
      mode="app"
      items={items}
      total={total}
      page={filters.page}
      pageSize={PAGE_SIZE}
      topics={topics}
      profiles={profiles}
      profileId={profile.id}
      unclassified={unclassified}
      canWork={ctx.org.role !== "viewer"}
      aiConfigured={isSentimentConfigured()}
      actions={{
        setStatus: setMentionStatus,
        toggleSaved: toggleSavedMention,
        correct: correctMentionSentiment,
        addManual: addManualMention,
        classify: classifyPending,
      }}
    />
  );
}
