"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { orgSchema, type OrgInput } from "@/lib/validation/auth";
import { createOrganization } from "./actions";

export function OrgForm() {
  const form = useForm<OrgInput>({ resolver: zodResolver(orgSchema), defaultValues: { name: "" } });
  const [pending, start] = React.useTransition();
  const error = form.formState.errors.name?.message;
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={form.handleSubmit((v) =>
        start(async () => {
          const r = await createOrganization(v);
          if (r && !r.ok) toast.error(r.error);
        }),
      )}
    >
      <FormField id="name" label="Nome da organização" error={error} hint="Ex.: Gabinete do Prefeito, Assessoria de Comunicação, nome da agência.">
        <Input id="name" autoFocus placeholder="Assessoria de Comunicação" aria-invalid={!!error} {...form.register("name")} />
      </FormField>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Criar organização e continuar <ArrowRight />
      </Button>
    </form>
  );
}
