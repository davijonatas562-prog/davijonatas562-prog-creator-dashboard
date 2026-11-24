import { z } from "zod";

const email = z.string().trim().min(1, "Informe seu e-mail.").email("E-mail inválido.").max(254);
const password = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.")
  .regex(/[A-Za-z]/, "Inclua pelo menos uma letra.")
  .regex(/\d/, "Inclua pelo menos um número.");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Informe sua senha."),
});

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(3, "Informe seu nome completo.").max(120),
    email,
    password,
    confirm: z.string(),
    consent: z.boolean().refine((v) => v, "É preciso aceitar os termos e a política de privacidade."),
  })
  .refine((d) => d.password === d.confirm, { message: "As senhas não coincidem.", path: ["confirm"] });

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({ password, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { message: "As senhas não coincidem.", path: ["confirm"] });

export const orgSchema = z.object({
  name: z.string().trim().min(2, "Use pelo menos 2 caracteres.").max(120, "Use no máximo 120 caracteres."),
});

export const profileNameSchema = z.object({
  fullName: z.string().trim().min(3, "Informe seu nome completo.").max(120),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotInput = z.infer<typeof forgotSchema>;
export type ResetInput = z.infer<typeof resetSchema>;
export type OrgInput = z.infer<typeof orgSchema>;
export type ProfileNameInput = z.infer<typeof profileNameSchema>;
