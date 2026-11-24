const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/faturas.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
const { calcularFaturas, faturasDoHistorico, gastoPorCategoria, mesAno, dataNumerica } = context.exports;
// Objetos criados dentro do vm têm outro protótipo; normaliza antes de comparar.
const eq = (a, b) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b);

// Cópia fiel de obterFaturasDoCartao (app/dashboard/page.tsx), que segue sendo a fonte dos cards.
function obterFaturasDoCartaoClassico(cartao, transacoes, hoje) {
  const diaFechamento = Number(cartao.dia_fechamento) || 1;
  const diaVencimento = Number(cartao.dia_vencimento) || 10;
  const transCartao = transacoes.filter(t => (t.tipo === 'despesa' && t.conta_id === cartao.id) || (t.tipo === 'transferencia' && t.conta_destino_id === cartao.id));
  let faturasAgrupadas = {}; let pagamentosTotais = 0;
  transCartao.forEach(t => {
    const val = Number(t.valor);
    if (t.tipo === 'despesa') {
      const [aStr, mStr, dStr] = t.data.split('-');
      let ano = Number(aStr); let mes = Number(mStr) - 1; const dia = Number(dStr);
      if (dia >= diaFechamento) { mes++; if (mes > 11) { mes = 0; ano++; } }
      const chave = `${ano}-${String(mes + 1).padStart(2, '0')}`;
      faturasAgrupadas[chave] = (faturasAgrupadas[chave] || 0) + val;
    } else if (t.tipo === 'transferencia') { pagamentosTotais += val; }
  });
  let faturasArray = Object.keys(faturasAgrupadas).sort().map(chave => {
    const [aStr, mStr] = chave.split('-');
    const anoNum = Number(aStr); const mesNum = Number(mStr) - 1;
    const dataVenc = new Date(anoNum, mesNum, diaVencimento);
    let dataFech = new Date(anoNum, mesNum, diaFechamento);
    if (diaVencimento < diaFechamento) dataFech = new Date(anoNum, mesNum - 1, diaFechamento);
    return { chave, dataVencimento: dataVenc, dataFechamento: dataFech, valorAberto: faturasAgrupadas[chave] };
  });
  let pagamentosRestantes = pagamentosTotais;
  for (let i = 0; i < faturasArray.length; i++) {
    if (pagamentosRestantes >= faturasArray[i].valorAberto) { pagamentosRestantes -= faturasArray[i].valorAberto; faturasArray[i].valorAberto = 0; }
    else { faturasArray[i].valorAberto -= pagamentosRestantes; pagamentosRestantes = 0; break; }
  }
  const h = new Date(hoje); h.setHours(0, 0, 0, 0);
  const faturasPendentes = faturasArray.filter(f => f.valorAberto > 0.01).map(f => {
    let status = 'Em Aberto';
    if (h > f.dataVencimento) status = 'Atrasada'; else if (h >= f.dataFechamento) status = 'Fechada';
    return { ...f, status };
  });
  faturasPendentes.reverse();
  return { totalGeral: faturasPendentes.reduce((acc, f) => acc + f.valorAberto, 0), faturasAbertas: faturasPendentes };
}

const cartao = { id: 'c', dia_fechamento: 5, dia_vencimento: 12 };
const compra = (data, valor, extra = {}) => ({ id: 'd' + data + valor, tipo: 'despesa', conta_id: 'c', data, valor, ...extra });
const pagto = (data, valor) => ({ id: 'p' + data + valor, tipo: 'transferencia', conta_id: 'banco', conta_destino_id: 'c', data, valor });
const hoje = new Date(2026, 10, 24);

test('em aberto e status batem com a tela clássica em 500 cenários aleatórios', () => {
  let semente = 42;
  const rand = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
  for (let n = 0; n < 500; n++) {
    const c = { id: 'c', dia_fechamento: 1 + Math.floor(rand() * 28), dia_vencimento: 1 + Math.floor(rand() * 28) };
    const trans = [];
    const qtd = Math.floor(rand() * 40);
    for (let k = 0; k < qtd; k++) {
      const data = `2026-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`;
      const valor = (Math.round(rand() * 50000) / 100).toFixed(2);
      trans.push(rand() < 0.75 ? compra(data, valor) : pagto(data, valor));
    }
    trans.push({ tipo: 'despesa', conta_id: 'outro', data: '2026-05-10', valor: '99.99' });
    const classico = obterFaturasDoCartaoClassico(c, trans, hoje);
    const novo = calcularFaturas(c, trans, hoje).filter(f => f.status !== 'paga');
    const statusClassico = { atrasada: 'Atrasada', fechada: 'Fechada', atual: 'Em Aberto', futura: 'Em Aberto' };
    eq(novo.map(f => f.competencia).reverse(), classico.faturasAbertas.map(f => f.chave));
    novo.reverse().forEach((f, i) => {
      assert.ok(Math.abs(f.aberto - classico.faturasAbertas[i].valorAberto) < 1e-6, `cenário ${n}, ${f.competencia}`);
      assert.equal(statusClassico[f.status], classico.faturasAbertas[i].status);
    });
  }
});

test('pagamentos ficam registrados na fatura que quitaram', () => {
  const f = calcularFaturas(cartao, [compra('2026-09-10', 100), compra('2026-10-10', 50.5), compra('2026-11-10', 30), pagto('2026-10-12', 120), pagto('2026-11-12', 30.5)], hoje);
  eq(f.map(x => [x.competencia, x.status, x.pago, x.aberto]), [['2026-10', 'paga', 100, 0], ['2026-11', 'paga', 50.5, 0], ['2026-12', 'atual', 0, 30]]);
  eq(f[0].pagamentos.map(p => p.valor), [100]);
  eq(f[1].pagamentos.map(p => p.valor), [20, 30.5]);
});

test('histórico mostra só as pagas; padrão = N mais recentes; mês inicial amplia', () => {
  const trans = [];
  for (let m = 1; m <= 9; m++) { trans.push(compra(`2026-0${m}-01`, 10)); trans.push(pagto(`2026-0${m}-20`, 10)); }
  trans.push(compra('2026-11-01', 10)); // em aberto: não entra no histórico
  const historico = calcularFaturas(cartao, trans, hoje);
  const padrao = faturasDoHistorico(historico, 5, null);
  eq(padrao.visiveis.map(f => f.competencia), ['2026-09', '2026-08', '2026-07', '2026-06', '2026-05']);
  assert.equal(padrao.inicioPadrao, '2026-05');
  eq(faturasDoHistorico(historico, 5, '2026-02').visiveis.map(f => f.competencia), ['2026-09', '2026-08', '2026-07', '2026-06', '2026-05', '2026-04', '2026-03', '2026-02']);
  eq(faturasDoHistorico(historico, 50, null).visiveis.length, 9);
  eq(faturasDoHistorico([], 5, null).visiveis, []);
});

test('formatos numéricos e gasto por categoria', () => {
  assert.equal(mesAno('2026-03'), '03/2026');
  assert.equal(dataNumerica(new Date(2026, 0, 5)), '05/01/2026');
  eq(gastoPorCategoria([compra('2026-11-01', 10, { categorias: { nome: 'Mercado' } }), compra('2026-11-02', 30, { categorias: { nome: 'Lazer' } }), compra('2026-11-03', 5)]).map(x => [x.nome, x.valor]), [['Lazer', 30], ['Mercado', 10], ['Sem categoria', 5]]);
});
