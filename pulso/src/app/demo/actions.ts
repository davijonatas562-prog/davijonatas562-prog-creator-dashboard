"use server";

import type { ActionResult } from "@/lib/action-result";

/** Na demonstração não há coleta: apenas recalcula a partir dos dados fictícios. */
export async function refreshDemo(): Promise<ActionResult> {
  await new Promise((r) => setTimeout(r, 700));
  return { ok: true, message: "Demonstração recalculada. Nenhuma fonte real foi consultada." };
}
