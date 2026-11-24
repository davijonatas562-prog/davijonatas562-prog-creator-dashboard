"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import type { ActionResult } from "@/lib/action-result";
import {
  forgotSchema,
  resetSchema,
  signInSchema,
  signUpSchema,
  type ForgotInput,
  type ResetInput,
  type SignInInput,
  type SignUpInput,
} from "@/lib/validation/auth";
import { requestPasswordReset, signIn, signUp, updatePassword } from "./actions";

function useSubmit<T extends FieldValues>(form: UseFormReturn<T>, action: (v: T) => Promise<ActionResult | undefined>) {
  const [pending, start] = React.useTransition();
  const [done, setDone] = React.useState<string | null>(null);
  const router = useRouter();
  const onSubmit = form.handleSubmit((values) =>
    start(async () => {
      const r = await action(values);
      if (!r) return;
      if (!r.ok) toast.error(r.error);
      else {
        if (r.message) toast.success(r.message);
        if (r.redirectTo) router.push(r.redirectTo);
        else setDone(r.message ?? "Pronto.");
      }
    }),
  );
  return { pending, done, onSubmit };
}

function TextField<T extends FieldValues>({
  form,
  name,
  label,
  type = "text",
  autoComplete,
  placeholder,
  disabled,
  aside,
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
  aside?: React.ReactNode;
}) {
  const [show, setShow] = React.useState(false);
  const error = form.formState.errors[name]?.message as string | undefined;
  const isPassword = type === "password";
  return (
    <FormField id={name} label={label} error={error} aside={aside}>
      <div className="relative">
        <Input
          id={name}
          type={isPassword && show ? "text" : type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className={isPassword ? "pr-10" : undefined}
          {...form.register(name)}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
    </FormField>
  );
}

function Submit({ pending, disabled, children }: { pending: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending || disabled}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}

function Done({ message, children }: { message: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-positive/30 bg-positive/10 p-5 text-center animate-in fade-in-0 zoom-in-95">
      <MailCheck className="mx-auto size-8 text-positive" />
      <p className="mt-3 text-sm">{message}</p>
      {children}
    </div>
  );
}

export function SignInForm({ next, disabled }: { next?: string; disabled: boolean }) {
  const form = useForm<SignInInput>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" } });
  const { pending, onSubmit } = useSubmit(form, (v) => signIn(v, next));
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <TextField form={form} name="email" label="E-mail" type="email" autoComplete="email" placeholder="voce@exemplo.com.br" disabled={disabled} />
      <TextField
        form={form}
        name="password"
        label="Senha"
        type="password"
        autoComplete="current-password"
        disabled={disabled}
        aside={
          <Link href="/recuperar-senha" className="text-xs text-muted-foreground hover:text-primary">
            Esqueceu a senha?
          </Link>
        }
      />
      <Submit pending={pending} disabled={disabled}>
        Entrar
      </Submit>
    </form>
  );
}

export function SignUpForm({ disabled }: { disabled: boolean }) {
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "", confirm: "", consent: false },
  });
  const { pending, done, onSubmit } = useSubmit(form, signUp);
  if (done)
    return (
      <Done message={done}>
        <p className="mt-2 text-xs text-muted-foreground">Não recebeu? Verifique o spam ou aguarde alguns minutos.</p>
      </Done>
    );
  const consentError = form.formState.errors.consent?.message;
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <TextField form={form} name="fullName" label="Nome completo" autoComplete="name" placeholder="Seu nome" disabled={disabled} />
      <TextField form={form} name="email" label="E-mail profissional" type="email" autoComplete="email" placeholder="voce@exemplo.com.br" disabled={disabled} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField form={form} name="password" label="Senha" type="password" autoComplete="new-password" disabled={disabled} />
        <TextField form={form} name="confirm" label="Confirmar senha" type="password" autoComplete="new-password" disabled={disabled} />
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">Mínimo de 8 caracteres, com letras e números.</p>
      <div className="grid gap-1.5">
        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
          <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" disabled={disabled} {...form.register("consent")} />
          <span>
            Li e aceito os termos de uso e a{" "}
            <Link href="/privacidade" target="_blank" className="text-primary hover:underline">
              política de privacidade
            </Link>
            , incluindo o tratamento dos meus dados de cadastro conforme a LGPD.
          </span>
        </label>
        {consentError && (
          <p role="alert" className="text-xs text-negative">
            {consentError}
          </p>
        )}
      </div>
      <Submit pending={pending} disabled={disabled}>
        Criar conta
      </Submit>
    </form>
  );
}

export function ForgotForm({ disabled }: { disabled: boolean }) {
  const form = useForm<ForgotInput>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });
  const { pending, done, onSubmit } = useSubmit(form, requestPasswordReset);
  if (done) return <Done message={done} />;
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <TextField form={form} name="email" label="E-mail da conta" type="email" autoComplete="email" placeholder="voce@exemplo.com.br" disabled={disabled} />
      <Submit pending={pending} disabled={disabled}>
        Enviar link de redefinição
      </Submit>
    </form>
  );
}

export function ResetForm({ disabled }: { disabled: boolean }) {
  const form = useForm<ResetInput>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirm: "" } });
  const { pending, onSubmit } = useSubmit(form, updatePassword);
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <TextField form={form} name="password" label="Nova senha" type="password" autoComplete="new-password" disabled={disabled} />
      <TextField form={form} name="confirm" label="Confirmar nova senha" type="password" autoComplete="new-password" disabled={disabled} />
      <Submit pending={pending} disabled={disabled}>
        Salvar nova senha
      </Submit>
    </form>
  );
}
