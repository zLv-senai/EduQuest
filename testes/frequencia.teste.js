// node testes/frequencia.teste.js (a partir da pasta site)
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
['dados.js','regras.js','graficos.js','telas.js','missoes.js','ranking.js','frequencia.js'].forEach(function(f){
  vm.runInContext(fs.readFileSync(path.join(raiz,'js',f),'utf8'), ctx, { filename:f });
});
vm.runInContext('render=function(){}; aviso=function(){}; hojeISO=function(){ return "2026-10-29"; };', ctx);   // quinta-feira
function rodar(c){ return vm.runInContext(c, ctx); }
function aluno(datas){
  return rodar('(function(d){ var a=novoAluno("Teste da Silva"); a.ausencias=d.map(novaAusencia); return prepararFrequencia(a); })')(datas);
}

var tests = [], t = function(n, f){ tests.push([n, f]); };

t('dia letivo pula o fim de semana', function(){
  assert.strictEqual(rodar('diaLetivoAnterior("2026-10-26")'), '2026-10-23');   // segunda -> sexta
  assert.strictEqual(rodar('diasLetivosAtras(0)'), '2026-10-29');
  assert.strictEqual(rodar('diasLetivosAtras(4)'), '2026-10-23');
});

t('faltas seguidas contam por dia letivo, inclusive sexta + segunda', function(){
  var s = rodar('sequenciaFaltas')(aluno(['2026-10-26','2026-10-23','2026-10-27']));
  assert.strictEqual(s.dias, 3); assert.strictEqual(s.ate, '2026-10-27'); assert.ok(s.recente);
  assert.strictEqual(rodar('sequenciaFaltas')(aluno(['2026-10-29','2026-10-27'])).dias, 1);   // pulou quarta
});

t('falta antiga nao gera alerta de sequencia', function(){
  var s = rodar('sequenciaFaltas')(aluno(['2026-09-01','2026-09-02']));
  assert.strictEqual(s.dias, 2); assert.strictEqual(s.recente, false);
});

t('prepararFrequencia: ordena, tira data repetida/invalida e atualiza faltas', function(){
  var a = aluno(['2026-10-20','2026-10-28','2026-10-20','lixo']);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(a.ausencias.map(function(f){ return f.data; }))), ['2026-10-28','2026-10-20']);
  assert.strictEqual(a.faltas, 2);
});

t('arquivo com URL perigosa e descartado', function(){
  var a = rodar('(function(){ var a=novoAluno("X"); a.ausencias=[{id:"f1",data:"2026-10-28",just:{texto:"x",status:"hackeado",arquivo:{nome:"a",url:"javascript:alert(1)"}}}]; return prepararFrequencia(a); })()');
  assert.strictEqual(a.ausencias[0].just.arquivo, null);
  assert.strictEqual(a.ausencias[0].just.status, 'pendente');
  assert.ok(rodar('arquivoValido')({ url:'data:image/jpeg;base64,AAAA' }));
  assert.ok(!rodar('arquivoValido')({ url:'data:text/html;base64,AAAA' }));
});

t('risco: 3 faltas seguidas sem justificativa e media baixa = alto', function(){
  var a = aluno(['2026-10-27','2026-10-28','2026-10-29']);
  a.materias.forEach(function(m){ m.nota = 4; });
  var r = rodar('riscoEvasao')(a);
  assert.strictEqual(r.nivel, 'alto');
  assert.ok(r.motivos.join(' ').indexOf('3 faltas seguidas') !== -1);
  var b = aluno([]);
  b.materias.forEach(function(m){ m.nota = 9; });
  assert.strictEqual(rodar('riscoEvasao')(b).nivel, 'baixo');
});

t('frequencia e grafico por semana', function(){
  var a = aluno(['2026-10-29','2026-10-28']);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(rodar('faltasPorSemana')(a))), [0,0,0,0,0,2]);
  assert.strictEqual(rodar('frequenciaPct')(a), 93);
});

t('cards escapam o texto da justificativa e o nome do arquivo', function(){
  var a = aluno(['2026-10-28']);
  a.ausencias[0].just = { texto:'<img src=x onerror=alert(1)>', status:'pendente',
                          arquivo:{ nome:'<b>at</b>.pdf', tipo:'application/pdf', url:'data:application/pdf;base64,AAAA' } };
  var prof = rodar('cardFrequenciaProf')(a), al = rodar('cardFaltasAluno')(a);
  [prof, al].forEach(function(h){ assert.ok(h.indexOf('<img src=x') === -1); assert.ok(h.indexOf('<b>at</b>') === -1); });
  assert.ok(prof.indexOf('data-avaliar') !== -1, 'professor ve aceitar/recusar');
});

t('alerta de faltas seguidas entra na lista do professor', function(){
  rodar('db.alunos = []');
  var a = aluno(['2026-10-28','2026-10-29']);
  rodar('(function(a){ db.alunos.push(a); })')(a);
  var lista = rodar('alertas()');
  assert.ok(lista[0].txt.indexOf('faltou 2 dias seguidos') !== -1);
});

t('radar mostra quem justificou as faltas seguidas, mesmo com risco baixo', function(){
  rodar('db.alunos = []');
  var a = aluno(['2026-10-28','2026-10-29']);
  a.materias.forEach(function(m){ m.nota = 9; });
  a.ausencias.forEach(function(f){ f.just = { texto:'febre', arquivo:null, status:'pendente' }; });
  rodar('(function(a){ db.alunos.push(a); })')(a);
  assert.strictEqual(rodar('riscoEvasao')(a).nivel, 'baixo');   // justificadas, o risco cai
  assert.ok(rodar('cardRadarEvasao()').indexOf('Teste da Silva') !== -1);
});

t('medalha Sem Faltas sai quando o aluno falta e volta quando a falta e apagada', function(){
  var a = aluno([]), conferir = rodar('conferirMedalhas');
  function tem(){ return a.medalhas.indexOf('Sem Faltas') !== -1; }
  conferir(a);
  assert.ok(tem(), 'aluno novo nasce com a medalha');
  a.ausencias.push(rodar('novaAusencia')('2026-10-29'));
  rodar('prepararFrequencia')(a); conferir(a);
  assert.ok(!tem(), 'depois de faltar, perde a medalha');
  a.ausencias = [];
  rodar('prepararFrequencia')(a); conferir(a);
  assert.ok(tem(), 'sem faltas de novo, volta a ter');
});

t('lerAnexo avisa com null quando recusa o arquivo (tipo errado ou PDF grande)', function(){
  var chamadas = [];
  function cb(arq){ chamadas.push(arq); }
  rodar('lerAnexo')({ type:'text/plain', name:'a.txt', size:10 }, cb);
  rodar('lerAnexo')({ type:'application/pdf', name:'g.pdf', size:2 * 1024 * 1024 }, cb);
  assert.deepStrictEqual(chamadas, [null, null]);
});

t('registrarFalta tira a medalha Sem Faltas', function(){
  var a = aluno([]), doc = ctx.document.getElementById;
  rodar('conferirMedalhas')(a);
  ctx.document.getElementById = function(){ return { value:'2026-10-29', focus:function(){} }; };
  try { rodar('registrarFalta')(a); } finally { ctx.document.getElementById = doc; }
  assert.strictEqual(a.faltas, 1);
  assert.strictEqual(a.medalhas.indexOf('Sem Faltas'), -1);
});

t('formulario redesenhado comeca sem anexo, como o campo de arquivo novo', function(){
  var doc = ctx.document.getElementById;
  rodar('anexoTemp = { nome:"atestado-velho.jpg" }');
  ctx.document.getElementById = function(id){ return id === 'jArquivo' ? {} : null; };
  try { rodar('ligarFrequencia()'); } finally { ctx.document.getElementById = doc; }
  assert.strictEqual(rodar('anexoTemp'), null);
});

var falhas = 0;
tests.forEach(function(x){
  try { x[1](); console.log('ok    ' + x[0]); }
  catch(e){ falhas++; console.log('FALHA ' + x[0] + '\n      ' + e.message); }
});
console.log(falhas ? falhas + ' falharam' : 'todos passaram');
process.exitCode = falhas ? 1 : 0;
