"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PainelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <TriangleAlert className="size-8 text-negative" />
      <h2 className="text-lg font-semibold">Não foi possível carregar esta página</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Houve uma falha ao consultar os dados. Tente novamente; se persistir, verifique a conexão com o banco.
        {error.digest && <span className="mt-1 block text-xs">Código: {error.digest}</span>}
      </p>
      <Button onClick={reset} variant="outline">
        Tentar novamente
      </Button>
    </div>
  );
}
