// node testes/missoes.teste.js (a partir da pasta site)
var fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
var raiz = path.join(__dirname, '..');
var mem = {};
var ctx = {
  console: console,
  localStorage: { getItem:function(k){ return k in mem ? mem[k] : null; }, setItem:function(k,v){ mem[k] = String(v); } },
  document: { getElementById:function(){ return null; }, querySelectorAll:function(){ return []; },
              createElement:function(){ return { remove:function(){} }; } },
  window: { addEventListener:function(){} },
  setTimeout: function(){}
};
vm.createContext(ctx);
['dados.js','regras.js','telas.js','missoes.js'].forEach(function(f){
  vm.runInContext(fs.readFileSync(path.join(raiz,'js',f),'utf8'), ctx, { filename:f });
});
// render/aviso viram no-op
vm.runInContext('render=function(){}; aviso=function(){};', ctx);
function rodar(c){ return vm.runInContext(c, ctx); }
function novo(){ return rodar('(function(){ var a=novoAluno("T"); a.id="x1"; prepararMissoes(a); return a; })()'); }
function dia(d){ rodar('hojeISO=function(){ return "' + d + '"; }'); }
function certa(a, d){ dia(d); return rodar('perguntaDoDia')(a, d).c; }

var tests = [], t = function(n, f){ tests.push([n, f]); };

t('pergunta deterministica por data e aluno', function(){
  var a = novo(), pd = rodar('perguntaDoDia');
  assert.strictEqual(pd(a, '2026-10-28'), pd(a, '2026-10-28'));
  var vistas = {};
  for (var i = 10; i <= 28; i++) vistas[pd(a, '2026-11-' + i).p] = 1;
  assert.ok(Object.keys(vistas).length > 5, 'deve variar entre dias');
});

t('banco: 4 alternativas, 3+ por materia, indice valido', function(){
  var P = rodar('PERGUNTAS'), cont = {};
  P.forEach(function(q){
    assert.strictEqual(q.o.length, 4); assert.ok(q.c >= 0 && q.c < 4); assert.ok(q.e);
    cont[q.m] = (cont[q.m]||0) + 1;
  });
  for (var m = 0; m < 5; m++) assert.ok(cont[m] >= 3, 'materia ' + m);
});

t('acerto da +20 XP e +10 moedas', function(){
  var a = novo();
  var r = rodar('responderMissao')(a, certa(a, '2026-10-28'));
  assert.strictEqual(r.acertou, true);
  assert.strictEqual(a.xp, 20); assert.strictEqual(a.moedas, 10);
  assert.strictEqual(a.missao.sequencia, 1);
});

t('segunda resposta no mesmo dia nao paga', function(){
  var a = novo(), R = rodar('responderMissao');
  R(a, certa(a, '2026-10-28'));
  assert.strictEqual(R(a, certa(a, '2026-10-28')), null);
  assert.strictEqual(a.xp, 20); assert.strictEqual(a.moedas, 10);
});

t('erro nao paga mas conta presenca', function(){
  var a = novo(), errada = (certa(a, '2026-10-28') + 1) % 4;
  var r = rodar('responderMissao')(a, errada);
  assert.strictEqual(r.acertou, false);
  assert.strictEqual(a.xp, 0); assert.strictEqual(a.moedas, 0);
  assert.strictEqual(a.missao.sequencia, 1); assert.strictEqual(a.missao.escolha, errada);
});

t('bonus de +15 no 3o dia seguido; pular um dia zera', function(){
  var a = novo(), R = rodar('responderMissao');
  R(a, certa(a, '2026-10-30')); R(a, certa(a, '2026-10-31'));
  assert.strictEqual(a.moedas, 20);
  var r = R(a, certa(a, '2026-11-01'));
  assert.strictEqual(r.bonus, 15); assert.strictEqual(a.moedas, 45); assert.strictEqual(a.missao.sequencia, 3);
  R(a, certa(a, '2026-11-03'));
  assert.strictEqual(a.missao.sequencia, 1);
});

t('prepararMissoes conserta dado corrompido', function(){
  var P = rodar('prepararMissoes');
  [ {}, { moedas:'abc', missao:'x' }, { moedas:-5, missao:null }, { moedas:3.9, missao:{ data:'ontem', escolha:9, sequencia:-2 } } ]
    .forEach(function(a){
      P(a);
      assert.ok(a.moedas >= 0 && a.moedas === Math.floor(a.moedas));
      assert.strictEqual(a.missao.data, ''); assert.strictEqual(a.missao.escolha, -1);
      assert.strictEqual(a.missao.sequencia, 0); assert.strictEqual(a.missao.acertou, false);
    });
  var b = { moedas:3.9, missao:{ data:'2026-10-28', acertou:true, escolha:2, sequencia:4 } };
  P(b); assert.strictEqual(b.moedas, 3); assert.strictEqual(b.missao.sequencia, 4);
});

t('cardMissoes funciona com dado ruim e tem 4 botoes', function(){
  var a = novo(); dia('2026-10-28'); a.missao = 'lixo';
  var h = rodar('cardMissoes')(a);
  assert.ok(h.indexOf('Missão do Dia') > -1 && h.indexOf('data-resposta="3"') > -1);
});

var falhas = 0;
tests.forEach(function(x){
  try { x[1](); console.log('ok    ' + x[0]); }
  catch(e){ falhas++; console.log('FALHA ' + x[0] + ': ' + e.message); }
});
console.log(falhas ? falhas + ' falha(s)' : 'todos passaram');
process.exit(falhas ? 1 : 0);
