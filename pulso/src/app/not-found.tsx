import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="max-w-sm text-sm text-muted-foreground">O endereço pode ter mudado ou a página ainda não existe.</p>
      <Button asChild variant="outline">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </main>
  );
}
