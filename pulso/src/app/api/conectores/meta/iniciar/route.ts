import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { requireOrg, canEdit } from "@/lib/data/session";
import { isMetaConfigured } from "@/lib/connectors/meta";
import { metaAuthUrl } from "@/lib/connectors/meta-oauth";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const ctx = await requireOrg();
  if (!canEdit(ctx.org.role)) return NextResponse.redirect(new URL("/painel/fontes?meta=permissao", origin));
  if (!isMetaConfigured()) return NextResponse.redirect(new URL("/painel/fontes?meta=config", origin));
  const state = randomBytes(24).toString("hex");
  (await cookies()).set("pulso_meta_state", `${state}.${ctx.org.id}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/conectores/meta",
    maxAge: 600,
  });
  return NextResponse.redirect(metaAuthUrl(`${origin}/api/conectores/meta/retorno`, state));
}
