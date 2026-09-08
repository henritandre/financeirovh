"use client";

import { BotaoIcone, Button } from "../_ui/Button";

export function Cabecalho({
  isDarkMode,
  toggleTheme,
  onVoltarClassica,
  onNovo,
  onPix,
}: {
  isDarkMode: boolean;
  toggleTheme: () => void;
  onVoltarClassica: () => void;
  onNovo: () => void;
  onPix: () => void;
}) {
  return (
    <header
      className="sticky top-0 z-30 bg-[var(--nova-glass-1)] border-b border-[var(--nova-glass-border)]"
      style={{ backdropFilter: "var(--nova-blur-card)", WebkitBackdropFilter: "var(--nova-blur-card)" }}
    >
      <div className="px-4 lg:px-8 py-3 max-w-2xl lg:max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BotaoIcone onClick={onVoltarClassica} rotulo="Voltar para a UI Clássica">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </BotaoIcone>
          <p className="nova-brand">financeiro<span>vh.</span></p>
        </div>
        <div className="flex items-center gap-2">
          <Button variante="secondary" tamanho="sm" onClick={onPix}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            PIX
          </Button>
          <Button onClick={onNovo} tamanho="sm" className="nova-desktop-action">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Novo lançamento
          </Button>
          <BotaoIcone onClick={toggleTheme} rotulo="Alternar tema">
            {isDarkMode ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
              </svg>
            )}
          </BotaoIcone>
        </div>
      </div>
    </header>
  );
}

