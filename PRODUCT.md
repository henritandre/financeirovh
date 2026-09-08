# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Um casal que usa o app diariamente para controlar as finanças domésticas: saldo em contas, cartões de crédito, contas fixas, assinaturas e investimentos/reservas ("caixinhas"). Uso pessoal, não um produto comercial com usuários externos. [Inferido com evidência forte: nome do app, conteúdo em PT-BR, memória de projeto do usuário — não confirmado por entrevista nesta sessão.]

## Product Purpose

Substituir planilha manual por um sistema que registra lançamentos (receita/despesa/transferência, incl. parcelamento), acompanha saldo consolidado por banco/carteira/cartão, projeta faturas de cartão de crédito, gerencia contas fixas e assinaturas recorrentes, e trata "caixinhas" como reservas/investimentos com histórico de aporte/resgate/rendimento. Sucesso = os dois conseguem ver de relance quanto têm, quanto gastaram e para onde foi, sem reabrir uma planilha.

## Operating Context

Uso diário, provavelmente em mobile na maior parte do tempo e ocasionalmente em desktop. Autenticação via Supabase Auth; dados financeiros reais (não fictícios/demo). Cada lançamento pode ter parcelamento e afeta o cálculo de fatura do cartão pelo dia de fechamento.

## Capabilities and Constraints

- Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 (CSS-first, sem tailwind.config), Supabase (Postgres + Auth).
- Rotas existentes (produção): Dashboard, Insights, Investimentos/Patrimônio (caixinhas), Contas Fixas, Assinaturas, Contas (bancos/PIX), Categorias, Auditoria, Parâmetros, Perfil.
- Regra de negócio crítica: em "caixinhas" (investimentos), aporte/resgate/rendimento infla somas se calculado ingenuamente; exclusão de caixinha deve passar por `caixinhas_historico`. Qualquer nova superfície que toque nisso deve reutilizar a lógica existente, não reimplementar.
- Constraint atual do trabalho em andamento: está sendo construída uma segunda versão visual completa da UI ("UI Nova", estética "Liquid Glass" estilo Apple) em `app/nova/*`, isolada da UI clássica em produção, com toggle de preferência entre as duas persistido no Supabase (tabela `parametros`). A UI clássica não pode perder funcionalidade nem ser quebrada por esse trabalho.
- Sem biblioteca de ícones ou animação hoje; motion é feito com um motor de mola caseiro (`app/ui/spring.ts`) modelado no vocabulário Apple (damping/response).

## Evidence on Hand

Código-fonte da UI clássica em produção (`app/dashboard/page.tsx` e demais rotas) e um protótipo parcial da UI Nova (`app/ui-lab/page.tsx`) são a evidência de produto e visual incumbente para este trabalho.

## Product Principles

- Nunca perder funcionalidade da versão clássica ao construir a versão nova.
- Regras de negócio sensíveis (ex. caixinhas) vivem em um único lugar (hooks compartilhados), nunca duplicadas entre as duas UIs.
- A UI Nova é um ambiente controlado e reversível: pode ser desligada a qualquer momento sem afetar a Clássica.
- Motion e material (glass) servem hierarquia e feedback, não decoração gratuita.

## Accessibility & Inclusion

Suportar `prefers-reduced-motion` (já há um helper pronto, `prefereMenosMovimento()`) e `prefers-color-scheme`/dark mode manual, ambos herdados da base já existente no app.
