import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncOrganization } from "@/lib/connectors/sync";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Coleta agendada (Vercel Cron envia Authorization: Bearer CRON_SECRET). */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || auth.length !== expected.length || !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY ausente" }, { status: 500 });
  const { data } = await admin.from("social_connections").select("organization_id").eq("status", "connected");
  const orgs = [...new Set((data ?? []).map((d) => d.organization_id as string))];
  const started = Date.now();
  const done: { org: string; inserted: number }[] = [];
  for (const org of orgs) {
    if (Date.now() - started > 45_000) break; // deixa folga no limite de 60 s; o restante entra na próxima execução
    try {
      const r = await syncOrganization(org, "cron");
      done.push({ org, inserted: r.inserted });
    } catch (e) {
      console.error("cron sync", org, e);
    }
  }
  return NextResponse.json({ organizations: orgs.length, processed: done.length, inserted: done.reduce((s, d) => s + d.inserted, 0) });
}
