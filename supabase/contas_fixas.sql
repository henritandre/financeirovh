-- ============================================================
-- CONTAS FIXAS (bills tracker) — rodar manualmente no
-- Supabase SQL Editor. Não há migrations versionadas neste
-- projeto; este arquivo fica como referência/histórico local.
-- ============================================================

create table public.contas_fixas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria_id uuid not null references public.categorias(id) on delete restrict,
  arquivada boolean not null default false,
  arquivada_em timestamptz null,
  user_id uuid null references auth.users(id),
  autor_nome text null,
  criado_em timestamptz not null default now()
);

create index idx_contas_fixas_categoria_id on public.contas_fixas(categoria_id);
create index idx_contas_fixas_arquivada on public.contas_fixas(arquivada);

create table public.contas_fixas_ocorrencias (
  id uuid primary key default gen_random_uuid(),
  conta_fixa_id uuid not null references public.contas_fixas(id) on delete cascade,
  competencia_ano smallint not null,
  competencia_mes smallint not null check (competencia_mes between 1 and 12),
  status text not null default 'pendente' check (status in ('pendente', 'pago')),
  valor numeric(12,2) null,
  transacao_id uuid null references public.transacoes(id) on delete set null,
  data_pagamento date null,
  user_id uuid null references auth.users(id),
  autor_nome text null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint uq_conta_fixa_competencia unique (conta_fixa_id, competencia_ano, competencia_mes)
);

create index idx_cfo_conta_fixa_id on public.contas_fixas_ocorrencias(conta_fixa_id);
create index idx_cfo_transacao_id on public.contas_fixas_ocorrencias(transacao_id);
create index idx_cfo_status on public.contas_fixas_ocorrencias(status);

-- mantém atualizado_em em dia a cada update
create or replace function public.set_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_cfo_atualizado_em
before update on public.contas_fixas_ocorrencias
for each row execute function public.set_atualizado_em();

-- ============================================================
-- RLS — policies abertas para authenticated, espelhando o
-- comportamento observado nas tabelas existentes (transacoes,
-- categorias, contas não filtram leitura por user_id).
-- Se as tabelas existentes tiverem RLS DESATIVADO (não policies
-- abertas), rode em vez disso:
--   alter table public.contas_fixas disable row level security;
--   alter table public.contas_fixas_ocorrencias disable row level security;
-- ============================================================
alter table public.contas_fixas enable row level security;
alter table public.contas_fixas_ocorrencias enable row level security;

create policy "authenticated_all_contas_fixas"
  on public.contas_fixas for all
  to authenticated
  using (true) with check (true);

create policy "authenticated_all_contas_fixas_ocorrencias"
  on public.contas_fixas_ocorrencias for all
  to authenticated
  using (true) with check (true);
