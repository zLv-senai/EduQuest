// node testes/regras.teste.js (a partir da pasta site)
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
['dados.js','regras.js','telas.js'].forEach(function(f){
  vm.runInContext(fs.readFileSync(path.join(raiz,'js',f),'utf8'), ctx, { filename:f });
});
vm.runInContext('render=function(){}; aviso=function(){};', ctx);   // render mora no app.js, que nao carrega aqui
function rodar(c){ return vm.runInContext(c, ctx); }
function plano(x){ return JSON.parse(JSON.stringify(x)); }   // objeto do vm tem outro prototipo: sem isso o deepStrictEqual falha

// aluno minimo {xp, nivel}: devolve o que subiu e o aluno depois da chamada
function subir(xp, nivel){
  var a = { xp:xp, nivel:nivel };
  return { subiu: plano(rodar('subirNivel')(a)), aluno: a };
}

// nivel 10 custa 1000 xp, entao o aluno nao sobe de nivel no meio do teste; fica em db.alunos e em sel
function cenario(){
  return rodar('(function(){ var a = novoAluno("Teste da Silva"); a.nivel = 10; db.alunos = [a]; sel = a.id; return a; })()');
}

// os campos nota0..nota4 viram inputs falsos com o texto dado; depois roda salvarNotas
function salvarCom(textos){
  ctx.document.getElementById = function(id){
    var v = textos[Number(id.replace('nota', ''))];
    return v === undefined ? null : { value:v, focus:function(){} };
  };
  rodar('salvarNotas()');
}
function notas(a){ return plano(a.materias.map(function(m){ return m.nota; })); }

var tests = [], t = function(n, f){ tests.push([n, f]); };

t('subirNivel: 350 xp no nivel 1 sobe dois niveis e desconta 100 + 200', function(){
  var r = subir(350, 1);
  assert.deepStrictEqual(r.subiu, [2, 3]);
  assert.deepStrictEqual(r.aluno, { xp:50, nivel:3 });
});

t('subirNivel: xp igual ao custo sobe um nivel e zera o xp', function(){
  var r = subir(100, 1);
  assert.deepStrictEqual(r.subiu, [2]);
  assert.deepStrictEqual(r.aluno, { xp:0, nivel:2 });
});

t('subirNivel: xp abaixo do custo nao sobe e nao muda nada', function(){
  var r = subir(99, 1);
  assert.deepStrictEqual(r.subiu, []);
  assert.deepStrictEqual(r.aluno, { xp:99, nivel:1 });
});

// trava anti-farm: XP so entra para nota que MUDOU (nota * 10). E proposital, nao e bug: nao "conserte" sem querer
t('salvarNotas: tudo 8 de uma vez da 400 xp (5 notas mudaram, 80 cada)', function(){
  var a = cenario();
  salvarCom(['8','8','8','8','8']);
  assert.strictEqual(a.xp, 400);
  assert.deepStrictEqual(notas(a), [8,8,8,8,8]);
});

t('salvarNotas: salvar de novo os mesmos valores nao da xp', function(){
  var a = cenario();
  salvarCom(['8','8','8','8','8']);
  salvarCom(['8','8','8','8','8']);
  assert.strictEqual(a.xp, 400);
});

t('salvarNotas: mudar so a nota2 para 9 soma so 90 xp', function(){
  var a = cenario();
  salvarCom(['8','8','8','8','8']);
  salvarCom(['8','8','9','8','8']);
  assert.strictEqual(a.xp, 490);
  assert.deepStrictEqual(notas(a), [8,8,9,8,8]);
});

t('salvarNotas: nota invalida (11) nao muda xp nem notas, nem as outras que mudariam', function(){
  var a = cenario();
  salvarCom(['8','8','8','8','8']);
  salvarCom(['8','8','9','8','8']);
  salvarCom(['7','7','11','7','7']);   // as outras 4 mudariam, mas a validacao barra tudo antes de gravar
  assert.strictEqual(a.xp, 490);
  assert.deepStrictEqual(notas(a), [8,8,9,8,8]);
});

var falhas = 0;
tests.forEach(function(x){
  try { x[1](); console.log('ok    ' + x[0]); }
  catch(e){ falhas++; console.log('FALHA ' + x[0] + '\n      ' + e.message); }
});
console.log(falhas ? falhas + ' falharam' : 'todos passaram');
process.exitCode = falhas ? 1 : 0;
