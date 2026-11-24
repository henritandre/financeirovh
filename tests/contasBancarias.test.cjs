const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const js = ts.transpileModule(fs.readFileSync('lib/contasBancarias.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const ctx = { exports: {}, require: (m) => (m === './supabase' ? { supabase: {} } : require(m)), Number };
vm.runInNewContext(js, ctx);
const { montarForma, validarForma, tipoDaForma, podeEditarForma } = ctx.exports;
const eq = (a, b, msg) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, msg);

// Cópia fiel do payload de app/contas/page.tsx (handleSalvarChave)
function payloadClassico({ nomeChave, tipoChavePagto, subtipo, contaBancariaId, ultimosDigitos, tipoChavePix, chavePix, diaFechamento, diaVencimento }, userId, username) {
  return {
    nome: nomeChave, tipo: tipoChavePagto,
    conta_bancaria_id: tipoChavePagto !== 'dinheiro' ? contaBancariaId : null,
    ultimos_digitos: (tipoChavePagto === 'credito' || (tipoChavePagto === 'corrente' && subtipo === 'debito')) ? ultimosDigitos : null,
    subtipo: tipoChavePagto === 'corrente' ? subtipo : null,
    tipo_chave_pix: (tipoChavePagto === 'corrente' && subtipo === 'pix') ? tipoChavePix : null,
    chave_pix: (tipoChavePagto === 'corrente' && subtipo === 'pix') ? chavePix : null,
    dia_fechamento: tipoChavePagto === 'credito' ? Number(diaFechamento) : null,
    dia_vencimento: tipoChavePagto === 'credito' ? Number(diaVencimento) : null,
    user_id: userId, autor_nome: tipoChavePagto === 'dinheiro' ? 'Família' : username,
  };
}

const base = { nome: 'Nubank', contaBancariaId: 'b1', ultimosDigitos: '1234', tipoChavePix: 'celular', chavePix: '11999990000', diaFechamento: '5', diaVencimento: '12' };
const classicoDe = { debito: ['corrente', 'debito'], pix: ['corrente', 'pix'], credito: ['credito', 'debito'], dinheiro: ['dinheiro', 'debito'] };

test('montarForma grava o mesmo que a Clássica para cada tipo', () => {
  for (const tipo of ['debito', 'pix', 'credito', 'dinheiro']) {
    const [tipoChavePagto, subtipo] = classicoDe[tipo];
    const ref = payloadClassico({ nomeChave: base.nome, tipoChavePagto, subtipo, ...base }, 'u1', 'ana');
    eq(montarForma({ tipo, ...base }, 'u1', 'ana'), ref, tipo);
  }
});

test('tipoDaForma lê o registro de volta', () => {
  assert.equal(tipoDaForma({ tipo: 'corrente', subtipo: 'pix' }), 'pix');
  assert.equal(tipoDaForma({ tipo: 'corrente', subtipo: 'debito' }), 'debito');
  assert.equal(tipoDaForma({ tipo: 'corrente', subtipo: null }), 'debito');
  assert.equal(tipoDaForma({ tipo: 'credito' }), 'credito');
  assert.equal(tipoDaForma({ tipo: 'dinheiro' }), 'dinheiro');
});

test('validação exige o que a Clássica exigia', () => {
  const vazio = { tipo: 'credito', nome: '', contaBancariaId: '', ultimosDigitos: '12', tipoChavePix: '', chavePix: '', diaFechamento: '', diaVencimento: '40' };
  eq(Object.keys(validarForma(vazio)).sort(), ['contaBancariaId', 'diaFechamento', 'diaVencimento', 'nome', 'ultimosDigitos']);
  eq(Object.keys(validarForma({ ...vazio, tipo: 'pix', nome: 'x', contaBancariaId: 'b' })).sort(), ['chavePix', 'tipoChavePix']);
  eq(Object.keys(validarForma({ ...vazio, tipo: 'dinheiro', nome: 'Carteira' })), []);
  eq(Object.keys(validarForma({ tipo: 'credito', ...base })), []);
});

test('quem pode editar', () => {
  assert.equal(podeEditarForma({ tipo: 'dinheiro', user_id: 'outro' }, 'eu'), true);
  assert.equal(podeEditarForma({ tipo: 'credito', user_id: 'outro' }, 'eu'), false);
  assert.equal(podeEditarForma({ tipo: 'credito', user_id: 'eu' }, 'eu'), true);
});

test('ordenação de bancos: por usuário ou banco, desempate pela quantidade de formas', () => {
  const { ordenarBancos } = ctx.exports;
  const bancos = [
    { id: 'a', banco: 'Nubank', autor_nome: 'beto' },
    { id: 'b', banco: 'Itaú', autor_nome: 'ana' },
    { id: 'c', banco: 'Nubank', autor_nome: 'ana' },
    { id: 'd', banco: 'Inter', autor_nome: 'ana' },
  ];
  const qtd = { a: 3, b: 1, c: 1, d: 2 };
  const ids = (l) => l.map((b) => b.id).join('');
  // usuário: ana (d=2, b=1 e c=1 empatam -> por banco: Itaú, Nubank), depois beto
  assert.equal(ids(ordenarBancos(bancos, 'usuario', (b) => qtd[b.id])), 'dbca');
  // banco: Inter, Itaú, Nubank (a=3 antes de c=1)
  assert.equal(ids(ordenarBancos(bancos, 'banco', (b) => qtd[b.id])), 'dbac');
});
