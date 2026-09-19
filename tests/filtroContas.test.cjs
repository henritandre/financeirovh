const {test} = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const context = {exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/filtroContas.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, context);
const incluir = context.exports.incluirPorForma;
const contas = [{id:'credito',conta_bancaria_id:'nu'},{id:'pix',conta_bancaria_id:'nu'},{id:'inter',conta_bancaria_id:'inter'}];
test('todas incluídas inicialmente; excluir crédito preserva pix',()=>{
 assert.equal(incluir({conta_id:'credito'}, [], 'nu', contas), true);
 assert.equal(incluir({conta_id:'credito'}, ['credito'], 'nu', contas), false);
 assert.equal(incluir({conta_id:'pix'}, ['credito'], 'nu', contas), true);
});
test('transferências respeitam exclusão no lado do banco selecionado',()=>{
 const t = {conta_id:'inter',conta_destino_id:'credito'};
 assert.equal(incluir(t,['credito'],'nu',contas),false);
 assert.equal(incluir(t,['credito'],'inter',contas),true);
 assert.equal(incluir(t,['credito'],'',contas),false);
});
test('excluir todas não equivale a limpar filtro',()=>{
 assert.equal(incluir({conta_id:'pix'},['credito','pix'],'nu',contas),false);
 assert.equal(incluir({conta_id:'pix'},[],'nu',contas),true);
});
