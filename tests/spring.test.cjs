const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('app/ui/spring.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function ambiente() {
  let now = 0, next = 0;
  const queue = new Map();
  const context = { exports: {}, performance: { now: () => now }, requestAnimationFrame: cb => { queue.set(++next, cb); return next; }, cancelAnimationFrame: id => queue.delete(id) };
  vm.runInNewContext(source, context);
  return { criar: context.exports.criarMola, frame(ms) { now += ms; const callbacks = [...queue.values()]; queue.clear(); callbacks.forEach(cb => cb(now)); }, pendentes: () => queue.size };
}
for (const fps of [15, 30, 60, 120]) {
  test(`pressão prolongada fica limitada e retorna ao tamanho original a ${fps} fps`, () => {
    const env = ambiente();
    const values = [];
    const spring = env.criar(1, x => values.push(x));
    spring.animarPara(.96, { damping: 1, response: .12 });
    for (let i = 0; i < fps * 5; i++) env.frame(1000 / fps);
    assert.ok(values.every(x => Number.isFinite(x) && x >= .959 && x <= 1.001), `escala fora dos limites: ${Math.min(...values)} / ${Math.max(...values)}`);
    assert.equal(spring.valor(), .96);
    spring.animarPara(1, { damping: .8, response: .3 });
    for (let i = 0; i < fps * 3; i++) env.frame(1000 / fps);
    assert.equal(spring.valor(), 1);
    assert.equal(env.pendentes(), 0);
  });
}
test('interrupções, frames irregulares e retorno de aba não fazem a escala disparar', () => {
  const env = ambiente();
  const values = [];
  const spring = env.criar(1, x => values.push(x));
  for (let i = 0; i < 100; i++) {
    spring.animarPara(i % 2 ? 1 : .9, { damping: 1, response: .12 });
    env.frame([8, 17, 40, 1000][i % 4]);
  }
  spring.animarPara(1);
  for (let i = 0; i < 300; i++) env.frame(33);
  assert.ok(values.every(x => Number.isFinite(x) && x >= .89 && x <= 1.01));
  assert.equal(spring.valor(), 1);
});
test('resposta reduzida converge sem explosão em escalas e deslocamentos de painéis', () => {
  for (const initial of [1, 400]) {
    const env = ambiente();
    const values = [];
    const spring = env.criar(initial, x => values.push(x));
    spring.animarPara(0, { damping: 1, response: .01 });
    for (let i = 0; i < 60; i++) env.frame(33);
    assert.ok(values.every(x => Number.isFinite(x) && x >= 0 && x <= initial));
    assert.equal(spring.valor(), 0);
  }
});
