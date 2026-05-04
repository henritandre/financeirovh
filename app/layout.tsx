import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./ThemeContext";

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
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased dark:bg-gray-900 transition-colors`}>
        {/* É AQUI QUE A MÁGICA ACONTECE: O ThemeProvider abraça todo o sistema */}
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}