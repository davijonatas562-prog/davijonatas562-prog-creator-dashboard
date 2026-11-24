import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

/** Recebe os links de e-mail do Supabase (confirmação, recuperação) e cria a sessão. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const rawNext = url.searchParams.get("next") ?? "/painel";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/painel";
  const fail = NextResponse.redirect(new URL("/entrar?erro=link", url.origin));
  if (!isSupabaseConfigured()) return fail;

  const supabase = await createClient();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return fail;
  } else {
    return fail;
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
