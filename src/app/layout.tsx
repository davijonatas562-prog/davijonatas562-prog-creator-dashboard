import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppSidebar } from "@/components/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Painel de Conteúdo · @davisantsofc", template: "%s · @davisantsofc" },
  description: "Hooks, analytics, concorrentes, agendamento, calendário e notícias de IA.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="dark" style={{ colorScheme: "dark" }}>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <TooltipProvider>
          <div className="flex min-h-dvh flex-col md:flex-row">
            <AppSidebar />
            <main className="min-w-0 flex-1">
              <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">{children}</div>
            </main>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
