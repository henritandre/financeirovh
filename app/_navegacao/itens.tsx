import type { ReactNode } from "react";

/**
 * Páginas do menu de navegação, compartilhadas pela UI Clássica e pela Nova.
 * Ícones em traço (estilo Lucide), herdam a cor do texto via currentColor.
 */
export interface ItemNavegacao {
  href: string;
  rotulo: string;
  icone: ReactNode;
}

const svg = (filhos: ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {filhos}
  </svg>
);

export const ICONE_SAIR = svg(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>);

/** Telas que já têm versão na UI Nova; as demais abrem na Clássica. */
const NA_NOVA: Record<string, string> = { "/dashboard": "/nova/dashboard", "/insights": "/nova/insights", "/contas": "/nova/contas" };

/** `nova`: a versão de interface escolhida é a Nova (links vão para as telas dela quando existem). */
export function itensNavegacao(nova: boolean): { principais: ItemNavegacao[]; conta: ItemNavegacao[] } {
  const href = (rota: string) => (nova && NA_NOVA[rota]) || rota;
  return {
    principais: [
      { href: href("/dashboard"), rotulo: "Dashboard", icone: svg(<><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>) },
      { href: href("/insights"), rotulo: "Insights", icone: svg(<><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></>) },
      { href: "/investimentos", rotulo: "Gestão de patrimônio", icone: svg(<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>) },
      { href: href("/contas"), rotulo: "Gestão bancária", icone: svg(<><path d="M3 22h18" /><path d="M6 18v-7" /><path d="M10 18v-7" /><path d="M14 18v-7" /><path d="M18 18v-7" /><path d="M12 2 20 7H4z" /></>) },
      { href: "/contas-fixas", rotulo: "Contas fixas", icone: svg(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><path d="m9 16 2 2 4-4" /></>) },
      { href: "/assinaturas", rotulo: "Assinaturas", icone: svg(<><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></>) },
      { href: "/categorias", rotulo: "Categorias", icone: svg(<><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" /><path d="M7 7h.01" /></>) },
      { href: "/auditoria", rotulo: "Auditoria de lançamentos", icone: svg(<><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></>) },
    ],
    conta: [
      { href: "/perfil", rotulo: "Meu perfil", icone: svg(<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>) },
      { href: "/parametros", rotulo: "Parâmetros do sistema", icone: svg(<><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></>) },
    ],
  };
}

/** Página atual: a rota exata ou uma subrota dela (ex.: /nova/dashboard). */
export function estaAtivo(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}
