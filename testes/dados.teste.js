// node testes/dados.teste.js (a partir da pasta site)
var fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
var raiz = path.join(__dirname, '..');
var mem = {};
var renders = 0;
var ctx = {
  console: console,
  localStorage: { getItem:function(k){ return k in mem ? mem[k] : null; }, setItem:function(k,v){ mem[k] = String(v); } },
  document: { getElementById:function(){ return null; }, querySelectorAll:function(){ return []; },
              createElement:function(){ return { remove:function(){} }; } },
  window: { addEventListener:function(){} },
  setTimeout: function(){}
};
vm.createContext(ctx);
['dados.js','regras.js','graficos.js','telas.js','missoes.js','ranking.js','frequencia.js'].forEach(function(f){
  vm.runInContext(fs.readFileSync(path.join(raiz,'js',f),'utf8'), ctx, { filename:f });
});
ctx.render = function(){ renders++; };   // app.js nao carrega aqui; so conta os redesenhos
ctx.aviso  = function(){};
function rodar(c){ return vm.runInContext(c, ctx); }
var KEY = rodar('KEY');

// navegador sem nada salvo, ninguem logado
function abrirLimpo(){
  mem = {}; renders = 0;
  rodar('perfil = null; euSou = null; carregar();');
}
// a outra aba grava no localStorage uma copia alterada por f
function outraAbaSalva(f){
  var copia = JSON.parse(mem[KEY]);
  f(copia);
  mem[KEY] = JSON.stringify(copia);
}

var tests = [], t = function(n, f){ tests.push([n, f]); };

t('sem nada salvo, carregar semeia 8 alunos e grava', function(){
  abrirLimpo();
  assert.strictEqual(rodar('db.alunos.length'), 8);
  assert.strictEqual(JSON.parse(mem[KEY]).alunos.length, 8);
});

t('dado corrompido no localStorage recomeca com os 8 alunos de exemplo', function(){
  mem = {}; mem[KEY] = '{lixo';
  rodar('carregar()');
  assert.strictEqual(rodar('db.alunos.length'), 8);
});

t('outra aba salvou: le de novo, mantem o aluno selecionado e redesenha', function(){
  abrirLimpo();
  rodar('sel = db.alunos[1].id');
  var selecionado = rodar('sel');
  outraAbaSalva(function(c){ c.alunos[1].nome = 'Nome Novo'; });
  rodar('recarregarDeOutraAba({ key: KEY })');
  assert.strictEqual(rodar('db.alunos[1].nome'), 'Nome Novo');
  assert.strictEqual(rodar('sel'), selecionado);
  assert.strictEqual(renders, 1);
});

t('o salvar() seguinte desta aba nao apaga o que a outra gravou', function(){
  abrirLimpo();
  outraAbaSalva(function(c){ c.alunos[1].nome = 'Nome Novo'; });
  rodar('recarregarDeOutraAba({ key: KEY })');
  rodar('salvar()');
  assert.strictEqual(JSON.parse(mem[KEY]).alunos[1].nome, 'Nome Novo');
});

t('evento de outra chave do localStorage e ignorado', function(){
  abrirLimpo();
  var antes = rodar('db.alunos[1].nome');
  outraAbaSalva(function(c){ c.alunos[1].nome = 'Nome Novo'; });
  rodar('recarregarDeOutraAba({ key: "outra" })');
  assert.strictEqual(rodar('db.alunos[1].nome'), antes);
  assert.strictEqual(renders, 0);
});

t('aluno removido na outra aba: quem entrou como ele volta para a escolha', function(){
  abrirLimpo();
  rodar('perfil = "aluno"; euSou = db.alunos[2].id;');
  outraAbaSalva(function(c){ c.alunos.splice(2, 1); });
  rodar('recarregarDeOutraAba({ key: KEY })');
  assert.strictEqual(rodar('db.alunos.length'), 7);
  assert.strictEqual(rodar('perfil'), null);
  assert.strictEqual(rodar('euSou'), null);
});

t('aluno ainda existe na outra aba: continua logado', function(){
  abrirLimpo();
  rodar('perfil = "aluno"; euSou = db.alunos[2].id;');
  var eu = rodar('euSou');
  outraAbaSalva(function(c){ c.alunos[2].nome = 'Nome Novo'; });
  rodar('recarregarDeOutraAba({ key: KEY })');
  assert.strictEqual(rodar('perfil'), 'aluno');
  assert.strictEqual(rodar('euSou'), eu);
});

t('localStorage.clear() em outra aba (key null) tambem recarrega', function(){
  abrirLimpo();
  rodar('db.alunos[1].nome = "Antigo"');
  mem = {};   // a outra aba limpou tudo
  rodar('recarregarDeOutraAba({ key: null })');
  assert.strictEqual(rodar('db.alunos[1].nome'), 'Bruno Lima');
  assert.strictEqual(renders, 1);
});

t('ao abrir, tira a medalha Sem Faltas que ficou salva em aluno com falta', function(){
  abrirLimpo();
  var dado = JSON.parse(mem[KEY]);
  dado.alunos[0].ausencias = [{ id:'f1', data:'2026-10-27', just:null }];   // Ana: falta gravada antes da correcao, ainda com a medalha
  mem[KEY] = JSON.stringify(dado);
  rodar('carregar()');
  assert.strictEqual(rodar('db.alunos[0].faltas'), 1);
  assert.strictEqual(rodar('db.alunos[0].medalhas.indexOf("Sem Faltas")'), -1);
});

var falhas = 0;
tests.forEach(function(x){
  try { x[1](); console.log('ok    ' + x[0]); }
  catch(e){ falhas++; console.log('FALHA ' + x[0] + '\n      ' + e.message); }
});
console.log(falhas ? falhas + ' falharam' : 'todos passaram');
process.exitCode = falhas ? 1 : 0;
