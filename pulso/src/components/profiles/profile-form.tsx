"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, CheckCircle2, Loader2, Wand2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { Avatar } from "@/components/ui/avatar";
import { TagInput } from "./tag-input";
import { profileSchema, UF, type ProfileInput } from "@/lib/validation/profile";
import { matchesProfile, suggestTerms } from "@/lib/terms";
import { TERM_KIND_LABEL, type ProfileWithTerms, type SearchTermKind } from "@/lib/types";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

export interface ProfileFormActions {
  save: (input: unknown) => Promise<ActionResult>;
  upload: (form: FormData) => Promise<ActionResult & { path?: string }>;
}

const KIND_HINT: Record<SearchTermKind, string> = {
  primary: "Nomes pelos quais a pessoa é citada. Pelo menos um precisa aparecer no texto.",
  related: "Ampliam a busca nas fontes (ex.: “Prefeitura de …”), mas sozinhos não bastam.",
  context: "Evitam homônimos: se houver algum, a menção precisa citar ao menos um (ex.: o município).",
  exclude: "Nomes ou termos que descartam a menção (ex.: outra pessoa com nome parecido).",
};

type State = Omit<ProfileInput, "id" | "photoPath">;

function fromProfile(p: ProfileWithTerms | null): State {
  const byKind = (k: SearchTermKind) => p?.terms.filter((t) => t.kind === k).map((t) => t.term) ?? [];
  return {
    fullName: p?.fullName ?? "",
    publicName: p?.publicName ?? "",
    nicknames: p?.nicknames ?? [],
    office: p?.office ?? "",
    municipality: p?.municipality ?? "",
    state: (p?.state as State["state"]) ?? "",
    party: p?.party ?? "",
    primary: byKind("primary"),
    related: byKind("related"),
    context: byKind("context"),
    exclude: byKind("exclude"),
  };
}

export function ProfileForm({
  mode,
  base,
  initial,
  canEdit,
  actions,
}: {
  mode: "app" | "demo";
  base: string;
  initial: ProfileWithTerms | null;
  canEdit: boolean;
  actions?: ProfileFormActions;
}) {
  const router = useRouter();
  const [v, setV] = React.useState<State>(() => fromProfile(initial));
  const [photo, setPhoto] = React.useState<{ preview: string | null; path: string | null }>({ preview: initial?.photoUrl ?? null, path: null });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, start] = React.useTransition();
  const [uploading, startUpload] = React.useTransition();
  const [sample, setSample] = React.useState("");
  const isDemo = mode === "demo";
  const disabled = !canEdit;

  const set = <K extends keyof State>(k: K, val: State[K]) => setV((s) => ({ ...s, [k]: val }));

  const suggest = () => {
    const sug = suggestTerms({ fullName: v.fullName, publicName: v.publicName, office: v.office, municipality: v.municipality, nicknames: v.nicknames });
    if (!sug.length) {
      toast.info("Preencha nome, cargo e município para receber sugestões.");
      return;
    }
    setV((s) => {
      const merge = (cur: string[], add: string[]) => [...cur, ...add.filter((a) => !cur.some((c) => c.toLowerCase() === a.toLowerCase()))];
      return {
        ...s,
        primary: merge(s.primary, sug.filter((t) => t.kind === "primary").map((t) => t.term)),
        related: merge(s.related, sug.filter((t) => t.kind === "related").map((t) => t.term)),
        context: merge(s.context, sug.filter((t) => t.kind === "context").map((t) => t.term)),
      };
    });
    toast.success("Sugestões adicionadas. Revise antes de salvar.");
  };

  const onPhoto = (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error("Use uma imagem JPG, PNG ou WEBP.");
    if (file.size > 2 * 1024 * 1024) return toast.error("A foto pode ter no máximo 2 MB.");
    const preview = URL.createObjectURL(file);
    if (isDemo || !actions) {
      setPhoto({ preview, path: null });
      toast.info("Na demonstração, a foto não é enviada.");
      return;
    }
    startUpload(async () => {
      const fd = new FormData();
      fd.set("file", file);
      const r = await actions.upload(fd);
      if (r.ok && r.path) setPhoto({ preview, path: r.path });
      else toast.error(r.ok ? "Falha no envio." : r.error);
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = { id: initial && !isDemo ? initial.id : null, photoPath: photo.path, ...v };
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setErrors({});
    if (isDemo || !actions) {
      toast.info("Na demonstração, as alterações não são salvas. Crie uma conta para cadastrar perfis reais.");
      return;
    }
    start(async () => {
      const r = await actions.save(parsed.data);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(r.message ?? "Perfil salvo.");
        router.push(`${base}/perfis`);
        router.refresh();
      }
    });
  };

  const test = sample.trim()
    ? matchesProfile(
        sample,
        (["primary", "related", "context", "exclude"] as const).flatMap((kind) => v[kind].map((term) => ({ term, kind }))),
        v.nicknames,
      )
    : null;

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-4xl gap-4" noValidate>
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="Voltar">
          <Link href={`${base}/perfis`}>
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{initial ? `Editar ${initial.publicName}` : "Novo perfil monitorado"}</h1>
          <p className="text-sm text-muted-foreground">Dados da pessoa pública e termos usados para encontrar menções.</p>
        </div>
      </div>

      <Card className="grid gap-6 p-5 md:grid-cols-[200px_1fr] md:p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar name={v.publicName || "Novo perfil"} src={photo.preview} className="size-24 text-xl" />
          <label className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent", disabled && "pointer-events-none opacity-50")}>
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
            {photo.preview ? "Trocar foto" : "Enviar foto"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} disabled={disabled} />
          </label>
          <p className="text-[11px] text-muted-foreground">JPG, PNG ou WEBP até 2 MB. Use foto oficial/pública.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="fullName" label="Nome completo" error={errors.fullName}>
            <Input id="fullName" value={v.fullName} disabled={disabled} onChange={(e) => set("fullName", e.target.value)} placeholder="Alessandro Brazão" />
          </FormField>
          <FormField id="publicName" label="Nome público" error={errors.publicName} hint="Como aparece no painel.">
            <Input id="publicName" value={v.publicName} disabled={disabled} onChange={(e) => set("publicName", e.target.value)} placeholder="Prefeito Alessandro" />
          </FormField>
          <FormField id="office" label="Cargo atual" error={errors.office}>
            <Input id="office" value={v.office} disabled={disabled} onChange={(e) => set("office", e.target.value)} placeholder="Prefeito" list="cargos" />
            <datalist id="cargos">
              {["Prefeito", "Prefeita", "Vice-prefeito", "Vereador", "Vereadora", "Deputado estadual", "Deputada estadual", "Deputado federal", "Deputada federal", "Senador", "Senadora", "Governador", "Governadora", "Secretário municipal"].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </FormField>
          <FormField id="party" label="Partido (opcional)">
            <Input id="party" value={v.party} disabled={disabled} onChange={(e) => set("party", e.target.value)} />
          </FormField>
          <FormField id="municipality" label="Município">
            <Input id="municipality" value={v.municipality} disabled={disabled} onChange={(e) => set("municipality", e.target.value)} placeholder="Ferreira Gomes" />
          </FormField>
          <FormField id="state" label="Estado" error={errors.state}>
            <NativeSelect id="state" value={v.state} disabled={disabled} onChange={(e) => set("state", e.target.value as State["state"])}>
              <option value="">Selecione</option>
              {UF.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField id="nicknames" label="Apelidos" className="sm:col-span-2" hint="Pressione Enter para adicionar cada apelido.">
            <TagInput id="nicknames" value={v.nicknames} onChange={(x) => set("nicknames", x)} placeholder="Ex.: Brazão" disabled={disabled} />
          </FormField>
        </div>
      </Card>

      <Card className="grid gap-5 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Termos de monitoramento</h2>
            <p className="mt-1 max-w-xl text-xs text-muted-foreground">
              Definem quais publicações públicas pertencem a este perfil. Termos de contexto e exclusões evitam confundir pessoas com nomes parecidos.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={suggest} disabled={disabled}>
            <Wand2 /> Sugerir termos
          </Button>
        </div>
        {(["primary", "related", "context", "exclude"] as const).map((k) => (
          <FormField key={k} id={`terms-${k}`} label={TERM_KIND_LABEL[k]} hint={KIND_HINT[k]} error={errors[k]}>
            <TagInput
              id={`terms-${k}`}
              value={v[k]}
              onChange={(x) => set(k, x)}
              tone={k === "exclude" ? "exclude" : k === "context" ? "context" : "default"}
              placeholder={k === "primary" ? "Ex.: Alessandro Brazão" : k === "context" ? "Ex.: Ferreira Gomes" : k === "exclude" ? "Ex.: Alessandro Brazão Filho" : "Ex.: Prefeitura de Ferreira Gomes"}
              disabled={disabled}
            />
          </FormField>
        ))}

        <div className="rounded-lg border border-dashed border-border p-4">
          <p className="text-xs font-medium">Testar os termos</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Cole um texto de exemplo para ver se ele seria atribuído a este perfil.</p>
          <textarea
            value={sample}
            onChange={(e) => setSample(e.target.value)}
            rows={2}
            placeholder="Ex.: O prefeito Alessandro inaugurou a nova escola em Ferreira Gomes."
            className="mt-2 w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm outline-none focus-visible:border-primary/70"
          />
          {test && (
            <p className={cn("mt-2 flex items-center gap-1.5 text-xs", test.matched ? "text-positive" : "text-negative")}>
              {test.matched ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
              {test.matched ? "Seria atribuída ao perfil." : "Seria descartada."} <span className="text-muted-foreground">{test.reason}</span>
            </p>
          )}
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="ghost">
          <Link href={`${base}/perfis`}>Cancelar</Link>
        </Button>
        <Button type="submit" disabled={pending || uploading || disabled}>
          {pending && <Loader2 className="animate-spin" />}
          {initial ? "Salvar alterações" : "Cadastrar perfil"}
        </Button>
      </div>
    </form>
  );
}
