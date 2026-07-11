-- ============================================================
-- ASSINATURAS — cadastro de assinaturas recorrentes (streaming,
-- plano de celular etc.) com geração automática de lançamentos.
-- Rodar manualmente no Supabase SQL Editor.
--
-- O lançamento gerado entra em `transacoes` com a categoria
-- global "Assinaturas" (localizada por nome); a categoria "real"
-- da assinatura (ex: Telefonia) fica em assinaturas.categoria_id
-- e aparece só na tela de Assinaturas.
--
-- A geração acontece via função processar_assinaturas(), chamada
-- pelo app ao abrir o Dashboard: o banco faz o catch-up completo
-- (todas as cobranças vencidas, mesmo de vários dias) numa única
-- transação e retorna quantos lançamentos foram criados.
-- ============================================================

create table public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria_id uuid not null references public.categorias(id) on delete restrict,
  valor numeric(12,2) not null,
  recorrencia text not null check (recorrencia in ('semanal', 'mensal', 'anual')),
  -- mensal/anual: dia do mês (1-31, com ajuste automático em meses curtos)
  -- semanal: dia da semana (0=domingo ... 6=sábado)
  dia_cobranca smallint not null,
  -- só para recorrência anual (1-12)
  mes_cobranca smallint null check (mes_cobranca is null or (mes_cobranca between 1 and 12)),
  conta_id uuid not null references public.contas(id),
  proxima_cobranca date not null,
  arquivada boolean not null default false,
  arquivada_em timestamptz null,
  user_id uuid null references auth.users(id),
  autor_nome text null,
  criado_em timestamptz not null default now()
);

create index idx_assinaturas_proxima on public.assinaturas(proxima_cobranca) where arquivada = false;

-- vincula o lançamento gerado à assinatura de origem (histórico por card)
alter table public.transacoes
  add column assinatura_id uuid null references public.assinaturas(id) on delete set null;

create index idx_transacoes_assinatura_id on public.transacoes(assinatura_id);

alter table public.assinaturas enable row level security;

create policy "authenticated_all_assinaturas"
  on public.assinaturas for all
  to authenticated
  using (true) with check (true);

-- ============================================================
-- Função de processamento: gera todos os lançamentos vencidos.
-- FOR UPDATE SKIP LOCKED evita duplicidade se dois usuários
-- abrirem o app ao mesmo tempo.
-- ============================================================
create or replace function public.processar_assinaturas()
returns integer as $$
declare
  a record;
  cat_lancamento uuid;
  prox date;
  prox_base date;
  ultimo_dia int;
  total_gerado integer := 0;
begin
  -- categoria global usada nos lançamentos do Dashboard
  select id into cat_lancamento from public.categorias
    where tipo = 'despesa' and lower(nome) like 'assinatura%'
    order by nome limit 1;

  for a in
    select * from public.assinaturas
    where arquivada = false and proxima_cobranca <= current_date
    for update skip locked
  loop
    prox := a.proxima_cobranca;

    while prox <= current_date loop
      insert into public.transacoes (user_id, autor_nome, tipo, descricao, valor, data, categoria_id, conta_id, assinatura_id)
      values (
        a.user_id,
        a.autor_nome,
        'despesa',
        a.nome || ' Ref. ' || case when a.recorrencia = 'semanal'
          then to_char(prox, 'DD/MM/YYYY')
          else to_char(prox, 'MM/YYYY') end,
        a.valor,
        prox,
        coalesce(cat_lancamento, a.categoria_id),
        a.conta_id,
        a.id
      );
      total_gerado := total_gerado + 1;

      if a.recorrencia = 'semanal' then
        prox := prox + 7;
      elsif a.recorrencia = 'mensal' then
        prox_base := (date_trunc('month', prox) + interval '1 month')::date;
        ultimo_dia := extract(day from (prox_base + interval '1 month' - interval '1 day'))::int;
        prox := make_date(extract(year from prox_base)::int, extract(month from prox_base)::int, least(a.dia_cobranca, ultimo_dia));
      else -- anual
        prox_base := make_date(extract(year from prox)::int + 1, a.mes_cobranca, 1);
        ultimo_dia := extract(day from (prox_base + interval '1 month' - interval '1 day'))::int;
        prox := make_date(extract(year from prox_base)::int, a.mes_cobranca, least(a.dia_cobranca, ultimo_dia));
      end if;
    end loop;

    update public.assinaturas set proxima_cobranca = prox where id = a.id;
  end loop;

  return total_gerado;
end;
$$ language plpgsql;
