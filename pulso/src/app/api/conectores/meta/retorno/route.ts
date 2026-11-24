import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { requireOrg, canEdit } from "@/lib/data/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForPages } from "@/lib/connectors/meta-oauth";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const back = (q: string) => NextResponse.redirect(new URL(`/painel/fontes?meta=${q}`, url.origin));
  const jar = await cookies();
  const saved = jar.get("pulso_meta_state")?.value ?? "";
  jar.delete({ name: "pulso_meta_state", path: "/api/conectores/meta" });

  const [state, orgId] = saved.split(".");
  const got = url.searchParams.get("state") ?? "";
  if (!state || state.length !== got.length || !timingSafeEqual(Buffer.from(state), Buffer.from(got))) return back("estado");
  if (url.searchParams.get("error")) return back("cancelado");
  const code = url.searchParams.get("code");
  if (!code) return back("erro");

  const ctx = await requireOrg();
  if (ctx.org.id !== orgId || !canEdit(ctx.org.role)) return back("permissao");
  const admin = createAdminClient();
  if (!admin) return back("servicekey");

  try {
    const pages = await exchangeCodeForPages(code, `${url.origin}/api/conectores/meta/retorno`);
    if (!pages.length) return back("sempaginas");
    const available = pages.map((p) => ({ pageId: p.pageId, pageName: p.pageName, igUserId: p.igUserId, igUsername: p.igUsername }));
    const secrets = { pages: Object.fromEntries(pages.map((p) => [p.pageId, p.token])) };
    const { data: conns } = await admin
      .from("social_connections")
      .select("id, source_id, config")
      .eq("organization_id", orgId)
      .in("source_id", ["facebook", "instagram"]);
    for (const c of conns ?? []) {
      await admin
        .from("social_connections")
        .update({ config: { ...(c.config as object), available }, last_error: null })
        .eq("id", c.id);
      await admin
        .from("connection_secrets")
        .upsert({ connection_id: c.id, organization_id: orgId, secrets, updated_at: new Date().toISOString() });
    }
    await admin.from("audit_logs").insert({ organization_id: orgId, user_id: ctx.user.id, action: "connector.meta_authorized", entity: "social_connections", metadata: { pages: available.length } });
    return back("ok");
  } catch (e) {
    console.error("meta oauth", e);
    return back("erro");
  }
}
