// Garante que lib/insights.ts calcula exatamente o que a tela Clássica calculava.
// tests/referencias/insights-classico.txt é o bloco original de app/insights/page.tsx.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const transpila = (codigo) => ts.transpileModule(codigo, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;

const ctxNovo = { exports: {}, Intl, Date, Math, Number, String, Array, Object, Set, JSON };
vm.runInNewContext(transpila(fs.readFileSync('lib/insights.ts', 'utf8')), ctxNovo);
const { calcularInsights, PALETA, MESES_CURTOS } = ctxNovo.exports;

// Referência: o bloco original, com as mesmas dependências que ele tinha na tela.
const bloco = fs.readFileSync('tests/referencias/insights-classico.txt', 'utf8')
  .replace('const hojeData = new Date(); hojeData.setHours', 'const hojeData = new Date(__hoje); hojeData.setHours');
const usados = ['modo', 'nomeDoMes', 'totalDiasMes', 'computarMes', 'm', 'despesasCat', 'receitasCat', 'maioresGastos', 'projFixas', 'projVariaveis', 'totalProjFixas', 'totalProjVariaveis', 'faturasComprometidas', 'mediaReceita6Meses', 'despesasPrevistas', 'saldoPrevisto', 'narrativa', 'fluxoDiario', 'fluxoSemanal', 'runway', 'serie12m', 'evolucaoCategorias', 'fixoVariavel6m', 'donutSegs', 'diaLimiteGrafico', 'serieEsteExib', 'serieAntExib'];
const fonteRef = `exports.original = function (transacoes, contas, contasFixas, categoriasLista, poupancaIds, mesAtual, __hoje, username, email, formatarMoeda, PALETA, MESES_CURTOS) {\n${bloco}\nreturn { ${usados.join(', ')} };\n};`;
const ctxRef = { exports: {}, Intl, Date, Math, Number, String, Array, Object, Set, JSON };
vm.runInNewContext(transpila(fonteRef), ctxRef);
const { original } = ctxRef.exports;
const formatarMoeda = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// Dados aleatórios, mas reproduzíveis
function gerar(semente) {
  let s = semente;
  const r = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const cats = [
    { id: 'c1', nome: 'Mercado', tipo: 'despesa' }, { id: 'c2', nome: 'Assinatura streaming', tipo: 'despesa' },
    { id: 'c3', nome: 'Aluguel', tipo: 'despesa' }, { id: 'c4', nome: 'Lazer', tipo: 'despesa' },
    { id: 'c5', nome: 'Salário', tipo: 'receita' }, { id: 'c6', nome: 'Freela', tipo: 'receita' },
  ];
  const contas = [
    { id: 'k1', tipo: 'corrente' }, { id: 'cc', tipo: 'credito', dia_fechamento: 1 + Math.floor(r() * 28), dia_vencimento: 1 + Math.floor(r() * 28), ativo: true },
  ];
  const contasFixas = [{ id: 'f1', categoria_id: 'c3', arquivada: false, modo: 'unico', dia_vencimento: 1 + Math.floor(r() * 28) }, { id: 'f2', categoria_id: 'c4', arquivada: true }];
  const autores = ['ana', 'beto', 'Família'];
  const transacoes = [];
  const n = 20 + Math.floor(r() * 250);
  for (let i = 0; i < n; i++) {
    const ano = 2025 + Math.floor(r() * 2);
    const mes = 1 + Math.floor(r() * 12);
    const dia = 1 + Math.floor(r() * 28);
    const tipo = r() < 0.6 ? 'despesa' : r() < 0.8 ? 'receita' : 'transferencia';
    const cat = tipo === 'receita' ? cats[4 + Math.floor(r() * 2)] : tipo === 'despesa' ? (r() < 0.1 ? null : cats[Math.floor(r() * 4)]) : null;
    transacoes.push({
      id: 't' + i, tipo, valor: (Math.round(r() * 300000) / 100).toFixed(2),
      data: `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
      categoria_id: cat ? cat.id : null, categorias: cat ? { nome: cat.nome } : null,
      autor_nome: autores[Math.floor(r() * 3)],
      conta_id: tipo === 'despesa' && r() < 0.4 ? 'cc' : 'k1', conta_destino_id: tipo === 'transferencia' && r() < 0.5 ? 'cc' : null,
    });
  }
  const poupancaIds = transacoes.filter(() => r() < 0.05).map((t) => t.id);
  return { transacoes, contas, contasFixas, categoriasLista: cats, poupancaIds };
}

const normaliza = (v) => JSON.parse(JSON.stringify(v));

test('lib/insights.ts reproduz a tela Clássica em 300 cenários (passado, mês corrente e futuro)', () => {
  const hoje = new Date(2026, 5, 17); // 17/06/2026
  const meses = [new Date(2026, 5, 1), new Date(2026, 2, 1), new Date(2025, 10, 1), new Date(2026, 7, 1)];
  for (let k = 0; k < 300; k++) {
    const d = gerar(1000 + k);
    const mesAtual = meses[k % meses.length];
    const novo = calcularInsights(d, mesAtual, hoje);
    const ref = original(d.transacoes, d.contas, d.contasFixas, d.categoriasLista, d.poupancaIds, mesAtual, hoje, 'ana', 'a@x', formatarMoeda, PALETA, MESES_CURTOS);
    for (const chave of usados) {
      if (chave === 'computarMes') continue;
      assert.deepEqual(normaliza(novo[chave]), normaliza(ref[chave]), `cenário ${k}, campo ${chave}`);
    }
    for (const autor of [null, 'ana', 'beto']) {
      assert.deepEqual(normaliza(novo.computarMes(autor)), normaliza(ref.computarMes(autor)), `cenário ${k}, computarMes(${autor})`);
    }
  }
});

test('modo do mês: passado, corrente e futuro', () => {
  const d = gerar(7);
  const hoje = new Date(2026, 5, 17);
  assert.equal(calcularInsights(d, new Date(2026, 4, 1), hoje).modo, 'passado');
  assert.equal(calcularInsights(d, new Date(2026, 5, 1), hoje).modo, 'corrente');
  assert.equal(calcularInsights(d, new Date(2026, 6, 1), hoje).modo, 'futuro');
});
