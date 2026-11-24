import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: { default: "PULSO — Inteligência de reputação digital", template: "%s · PULSO" },
  description: "Monitore a reputação digital de pessoas públicas, entenda o sentimento das menções e antecipe crises.",
};

export const viewport: Viewport = { themeColor: "#080B12", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body>
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: { background: "var(--popover)", border: "1px solid var(--border)", color: "var(--foreground)" },
          }}
        />
      </body>
    </html>
  );
}
