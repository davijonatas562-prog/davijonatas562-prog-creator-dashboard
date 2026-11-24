import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { HookVault } from "@/components/hook-vault/hook-vault";
import { Button } from "@/components/ui/button";
import { hooks } from "@/lib/data/hooks";
import { getNavItem } from "@/lib/nav";

const item = getNavItem("/hook-vault");
export const metadata: Metadata = { title: item.title };

export default function HookVaultPage() {
  return (
    <>
      <PageHeader item={item} actions={<Button><Plus /> Salvar hook por link</Button>} />
      <HookVault hooks={hooks} />
    </>
  );
}
