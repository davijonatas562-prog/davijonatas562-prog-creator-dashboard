"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchOrganization } from "@/app/painel/actions";

export interface OrgOption {
  id: string;
  name: string;
  roleLabel: string;
}

export function OrgSwitcher({ orgs, currentOrgId }: { orgs: OrgOption[]; currentOrgId: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const current = orgs.find((o) => o.id === currentOrgId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2.5 text-left outline-none transition-colors hover:border-muted-foreground/30 focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] text-muted-foreground">Organização</span>
          <span className="block truncate text-sm font-medium">{current?.name ?? "Selecionar"}</span>
        </span>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[228px]">
        <DropdownMenuLabel>Suas organizações</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={currentOrgId ?? undefined}
          onValueChange={(id) =>
            start(async () => {
              const r = await switchOrganization(id);
              if (!r.ok) toast.error(r.error);
              else router.refresh();
            })
          }
        >
          {orgs.map((o) => (
            <DropdownMenuRadioItem key={o.id} value={o.id}>
              <span className="min-w-0 flex-1 truncate">{o.name}</span>
              <span className="text-[10px] text-muted-foreground">{o.roleLabel}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/onboarding?nova=1")}>
          <Plus />
          Nova organização
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
