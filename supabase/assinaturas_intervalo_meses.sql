-- ============================================================
-- ASSINATURAS — intervalo de meses configurável (mensal,
-- bimestral, trimestral etc.). Rodar depois de assinaturas.sql.
-- ============================================================

alter table public.assinaturas
  add column intervalo_meses smallint not null default 1 check (intervalo_meses >= 1);

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
        prox_base := (date_trunc('month', prox) + (greatest(a.intervalo_meses, 1) || ' months')::interval)::date;
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
