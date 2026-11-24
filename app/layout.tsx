import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./ThemeContext";
import { UIVersionProvider } from "./UIVersionContext";
import { PaletaProvider } from "./PaletaContext";

// Aplica a paleta salva antes da pintura, para não piscar o azul padrão ao recarregar.
const SCRIPT_PALETA = `try{var p=localStorage.getItem("paleta_cor");if(p&&p!=="azul")document.documentElement.setAttribute("data-paleta",p)}catch(e){}`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Controle Financeiro", 
  description: "Gestão do patrimônio e controle de gastos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_PALETA }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased dark:bg-gray-900 transition-colors`}>
        {/* É AQUI QUE A MÁGICA ACONTECE: O ThemeProvider abraça todo o sistema */}
        <ThemeProvider>
          <UIVersionProvider>
            <PaletaProvider>
              {children}
            </PaletaProvider>
          </UIVersionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}