const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/saldo.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const { calcularSaldo } = context.exports;
const t = (tipo, valor, conta_id = 'a', conta_destino_id = null, data = '2026-09-06') => ({tipo, valor, conta_id, conta_destino_id, data});
test('saldo zerado não tem resíduo nem zero negativo', () => {
  const itens = [t('receita', '188.14'), t('receita', '0.20'), t('despesa', '188.34')];
  assert.equal(calcularSaldo(itens, ['a']), 0);
  assert.equal(calcularSaldo([...itens].reverse(), ['a']), 0);
});
test('preserva débito real de um centavo', () => {
  assert.equal(calcularSaldo([t('receita', 0.3), t('despesa', 0.31)], ['a']), -0.01);
});
test('transferência interna é neutra e externa entra ou sai da conta correta', () => {
  const itens = [t('transferencia', 12.34, 'a', 'b')];
  assert.equal(calcularSaldo(itens, ['a', 'b']), 0);
  assert.equal(calcularSaldo(itens, ['a']), -12.34);
  assert.equal(calcularSaldo(itens, ['b']), 12.34);
});
test('evolução respeita data limite e contas selecionadas', () => {
  const itens = [t('receita', 10), t('despesa', 2, 'a', null, '2026-09-07'), t('receita', 20, 'b')];
  assert.equal(calcularSaldo(itens, ['a'], '2026-09-06'), 10);
  assert.equal(calcularSaldo(itens, ['a']), 8);
});
