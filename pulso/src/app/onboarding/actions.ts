"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { orgSchema } from "@/lib/validation/auth";
import { ORG_COOKIE } from "@/lib/data/session";
import type { ActionResult } from "@/lib/action-result";

export async function createOrganization(input: unknown): Promise<ActionResult> {
  const parsed = orgSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_organization", { p_name: parsed.data.name }).single<{ id: string }>();
  if (error || !data) {
    const msg = error?.message ?? "";
    return {
      ok: false,
      error: msg.includes("limite") ? "Você atingiu o limite de organizações criadas." : "Não foi possível criar a organização. Tente novamente.",
    };
  }
  (await cookies()).set(ORG_COOKIE, data.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/painel");
}
