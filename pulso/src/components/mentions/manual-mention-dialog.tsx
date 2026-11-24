"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SOURCES } from "@/lib/connectors/catalog";
import { CONTENT_TYPE_LABEL } from "@/lib/types";
import { manualMentionSchema, type ManualMentionInput } from "@/lib/validation/profile";

function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function ManualMentionDialog({
  open,
  onOpenChange,
  profileId,
  isDemo,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profileId: string;
  isDemo: boolean;
  onSubmit: (v: ManualMentionInput) => Promise<boolean>;
}) {
  const form = useForm<ManualMentionInput>({
    resolver: zodResolver(manualMentionSchema),
    defaultValues: { profileId, sourceId: "instagram", contentType: "post", content: "", url: "", author: "", publishedAt: nowLocal() },
  });
  const [pending, start] = React.useTransition();
  const e = form.formState.errors;

  React.useEffect(() => {
    if (open) form.reset({ profileId, sourceId: "instagram", contentType: "post", content: "", url: "", author: "", publishedAt: nowLocal() });
  }, [open, profileId, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogTitle>Registrar menção pública</DialogTitle>
        <DialogDescription className="mt-1">
          Cole uma publicação pública encontrada pela equipe. Não registre mensagens privadas nem conteúdo de áreas restritas.
        </DialogDescription>
        <form
          noValidate
          className="mt-5 grid gap-4"
          onSubmit={form.handleSubmit((v) =>
            start(async () => {
              const ok = await onSubmit({ ...v, publishedAt: new Date(v.publishedAt).toISOString() });
              if (ok) onOpenChange(false);
            }),
          )}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="sourceId" label="Rede ou fonte">
              <NativeSelect id="sourceId" {...form.register("sourceId")}>
                {SOURCES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="contentType" label="Tipo de conteúdo">
              <NativeSelect id="contentType" {...form.register("contentType")}>
                {Object.entries(CONTENT_TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
          <FormField id="content" label="Texto da publicação" error={e.content?.message}>
            <textarea
              id="content"
              rows={5}
              aria-invalid={!!e.content}
              className="w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm outline-none transition-[box-shadow,border-color] placeholder:text-muted-foreground/70 focus-visible:border-primary/70 focus-visible:ring-[3px] focus-visible:ring-primary/15"
              placeholder="Cole aqui o texto da publicação ou comentário…"
              {...form.register("content")}
            />
          </FormField>
          <FormField id="url" label="Link original (opcional)" error={e.url?.message}>
            <Input id="url" type="url" placeholder="https://…" aria-invalid={!!e.url} {...form.register("url")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="author" label="Autor (opcional)" hint="Nome público da página ou perfil.">
              <Input id="author" {...form.register("author")} />
            </FormField>
            <FormField id="publishedAt" label="Publicado em" error={e.publishedAt?.message}>
              <Input id="publishedAt" type="datetime-local" max={nowLocal()} {...form.register("publishedAt")} />
            </FormField>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {isDemo ? "Registrar (demonstração)" : "Registrar e analisar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
