"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/action-result";
import { profileNameSchema, resetSchema, type ProfileNameInput, type ResetInput } from "@/lib/validation/auth";
import { ROLE_LABEL, type MemberRole } from "@/lib/types";
import {
  changeMemberRole,
  changeMyPassword,
  deleteMyAccount,
  deleteOrganization,
  removeMember,
  updateMyName,
  updateOrganization,
} from "./actions";

function useAction() {
  const [pending, start] = React.useTransition();
  const run = (fn: () => Promise<ActionResult | undefined>, onOk?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r) return;
      if (r.ok) {
        toast.success(r.message ?? "Salvo.");
        onOk?.();
      } else toast.error(r.error);
    });
  return { pending, run };
}

export function NameForm({ fullName }: { fullName: string }) {
  const form = useForm<ProfileNameInput>({ resolver: zodResolver(profileNameSchema), defaultValues: { fullName } });
  const { pending, run } = useAction();
  const error = form.formState.errors.fullName?.message;
  return (
    <form noValidate className="grid gap-4 sm:max-w-md" onSubmit={form.handleSubmit((v) => run(() => updateMyName(v)))}>
      <FormField id="fullName" label="Nome completo" error={error}>
        <Input id="fullName" aria-invalid={!!error} {...form.register("fullName")} />
      </FormField>
      <Button type="submit" className="w-fit" disabled={pending || !form.formState.isDirty}>
        {pending && <Loader2 className="animate-spin" />} Salvar nome
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const form = useForm<ResetInput>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirm: "" } });
  const { pending, run } = useAction();
  const e = form.formState.errors;
  return (
    <form noValidate className="grid gap-4 sm:max-w-md" onSubmit={form.handleSubmit((v) => run(() => changeMyPassword(v), () => form.reset()))}>
      <FormField id="password" label="Nova senha" error={e.password?.message} hint="Mínimo de 8 caracteres, com letras e números.">
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!e.password} {...form.register("password")} />
      </FormField>
      <FormField id="confirm" label="Confirmar nova senha" error={e.confirm?.message}>
        <Input id="confirm" type="password" autoComplete="new-password" aria-invalid={!!e.confirm} {...form.register("confirm")} />
      </FormField>
      <Button type="submit" variant="secondary" className="w-fit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Alterar senha
      </Button>
    </form>
  );
}

export function OrgSettingsForm({ name, retention, canEdit }: { name: string; retention: number; canEdit: boolean }) {
  const [values, setValues] = React.useState({ name, dataRetentionDays: String(retention) });
  const { pending, run } = useAction();
  const dirty = values.name !== name || values.dataRetentionDays !== String(retention);
  return (
    <form
      className="grid gap-4 sm:max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateOrganization(values));
      }}
    >
      <FormField id="org-name" label="Nome da organização">
        <Input id="org-name" value={values.name} disabled={!canEdit} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
      </FormField>
      <FormField id="retention" label="Retenção de menções" hint="Menções mais antigas que isso são apagadas automaticamente (LGPD).">
        <NativeSelect id="retention" value={values.dataRetentionDays} disabled={!canEdit} onChange={(e) => setValues((v) => ({ ...v, dataRetentionDays: e.target.value }))}>
          <option value="30">30 dias</option>
          <option value="90">90 dias</option>
          <option value="180">180 dias</option>
          <option value="365">1 ano</option>
          <option value="730">2 anos</option>
        </NativeSelect>
      </FormField>
      {canEdit && (
        <Button type="submit" className="w-fit" disabled={pending || !dirty}>
          {pending && <Loader2 className="animate-spin" />} Salvar alterações
        </Button>
      )}
    </form>
  );
}

export function MemberRoleControl({ userId, role, editable }: { userId: string; role: MemberRole; editable: boolean }) {
  const { pending, run } = useAction();
  if (!editable || role === "owner") return <span className="text-xs text-muted-foreground">{ROLE_LABEL[role]}</span>;
  return (
    <div className="flex items-center gap-2">
      <NativeSelect
        aria-label="Papel"
        className="w-40"
        defaultValue={role}
        disabled={pending}
        onChange={(e) => run(() => changeMemberRole({ userId, role: e.target.value }))}
      >
        <option value="admin">{ROLE_LABEL.admin}</option>
        <option value="analyst">{ROLE_LABEL.analyst}</option>
        <option value="viewer">{ROLE_LABEL.viewer}</option>
      </NativeSelect>
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="sm" disabled={pending}>
            Remover
          </Button>
        }
        title="Remover membro?"
        description="A pessoa perde o acesso a todos os dados desta organização imediatamente."
        confirmLabel="Remover"
        onConfirm={() => removeMember(userId)}
      />
    </div>
  );
}

export function DangerConfirm({
  kind,
  expected,
}: {
  kind: "organization" | "account";
  expected: string;
}) {
  const [value, setValue] = React.useState("");
  const { pending, run } = useAction();
  const isOrg = kind === "organization";
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-fit">
          {isOrg ? "Excluir organização" : "Excluir minha conta"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{isOrg ? "Excluir organização e todos os dados" : "Excluir sua conta"}</DialogTitle>
        <DialogDescription className="mt-1">
          {isOrg
            ? "Perfis, menções, análises, alertas, relatórios e registros desta organização serão apagados de forma permanente."
            : "Seus dados pessoais de cadastro serão apagados de forma permanente. Esta ação não pode ser desfeita."}
        </DialogDescription>
        <form
          className="mt-5 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => (isOrg ? deleteOrganization(value) : deleteMyAccount(value)));
          }}
        >
          <FormField id="confirm-danger" label={`Digite ${isOrg ? `"${expected}"` : "EXCLUIR"} para confirmar`}>
            <Input id="confirm-danger" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" />
          </FormField>
          <Button type="submit" variant="destructive" disabled={pending || value.trim() !== (isOrg ? expected : "EXCLUIR")}>
            {pending && <Loader2 className="animate-spin" />} Excluir definitivamente
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<ActionResult>;
}) {
  const [open, setOpen] = React.useState(false);
  const { pending, run } = useAction();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="mt-1">{description}</DialogDescription>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={pending} onClick={() => run(onConfirm, () => setOpen(false))}>
            {pending && <Loader2 className="animate-spin" />} {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
