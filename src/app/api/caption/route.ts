import { NextResponse } from "next/server";
import { generateCaption } from "@/lib/caption";
import type { Platform } from "@/lib/types";

// Ponto de integração com o LLM. Hoje usa o gerador local; o contrato de entrada/saída já é o final.
export async function POST(req: Request) {
  const { idea, platforms } = (await req.json()) as { idea?: string; platforms?: Platform[] };
  if (!idea?.trim()) return NextResponse.json({ error: "Ideia vazia" }, { status: 400 });
  return NextResponse.json({ caption: generateCaption(idea, platforms ?? []) });
}
