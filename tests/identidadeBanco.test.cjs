const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const ctx = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/nova/_lib/identidadeBanco.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, ctx);
const { identidadeBanco, BANCOS_CONHECIDOS } = ctx.exports;
const logos = fs.readdirSync('public/logos/bancos').filter((f) => f.endsWith('.svg')).map((f) => f.replace('.svg', ''));

test('todo banco do catálogo é reconhecido e tem logo', () => {
  for (const nome of BANCOS_CONHECIDOS) {
    const { chave } = identidadeBanco(nome);
    assert.ok(logos.includes(chave), `${nome} -> ${chave} sem logo`);
  }
});

test('bancos que já existiam continuam com a mesma identidade', () => {
  const antes = { 'Nubank': 'nubank', 'Nu Pagamentos': 'nubank', 'Itaú': 'itau', 'Banco Inter': 'inter', 'Caixa Econômica': 'caixa', 'Santander': 'santander', 'Mercantil do Brasil': 'mercantil', 'Bradesco': 'bradesco', 'Banco do Brasil': 'bb', 'BB': 'bb', 'Carteira': 'carteira', 'Banco Qualquer': 'neutro' };
  for (const [nome, chave] of Object.entries(antes)) assert.equal(identidadeBanco(nome).chave, chave, nome);
});

test('grafias comuns dos bancos novos', () => {
  const casos = { 'C6': 'c6', 'Banco C6': 'c6', 'Mercado Pago': 'mercadopago', 'MercadoPago': 'mercadopago', 'PagSeguro': 'pagbank', 'Pic Pay': 'picpay', 'Banco do Nordeste': 'bnb', 'Sicredi': 'sicredi', 'BTG Pactual': 'btg' };
  for (const [nome, chave] of Object.entries(casos)) assert.equal(identidadeBanco(nome).chave, chave, nome);
});
