// roda com: node testes/ranking.teste.js (a partir da pasta site)
var fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');

var mem = {};
var ctx = vm.createContext({
  console: console,
  localStorage: { getItem:function(k){ return k in mem ? mem[k] : null; }, setItem:function(k,v){ mem[k]=String(v); } },
  document: { getElementById:function(){ return null; }, createElement:function(){ return {}; }, addEventListener:function(){}, querySelectorAll:function(){ return []; }, body:{ appendChild:function(){} } },
  window: { matchMedia:function(){ return { matches:false }; } }
});
['dados','regras','telas','graficos','ranking'].forEach(function(n){
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
});

// aluno com media exata m (todas as materias iguais)
function mk(id, nome, m, ant){
  var a = { id:id, matricula:'0', nome:nome, faltas:0, xp:0, nivel:1, medalhas:[],
            materias:[1,2,3].map(function(i){ return { nome:'M'+i, nota:m }; }) };
  if (ant !== undefined) a.mediaAnterior = ant;
  return a;
}
function usar(lista){ vm.runInContext('db.alunos = ' + JSON.stringify(lista) + ';', ctx); }
function run(js){ return vm.runInContext(js, ctx); }
function j(js){ return JSON.parse(run('JSON.stringify(' + js + ')')); }
function ids(l){ return l.map(function(a){ return a.id; }).join(','); }

// 12 alunos -> ligas 5,5,2 com nomes em ordem
var doze = [];
for (var i = 0; i < 12; i++) doze.push(mk('x'+i, 'Aluno'+i, 7, 6));
usar(doze);
var ls = j('ligas()');
assert.deepStrictEqual(ls.map(function(l){ return l.alunos.length; }), [5,5,2]);
assert.deepStrictEqual(ls.map(function(l){ return l.nome; }), ['Pixel','Sprite','Shader']);
assert.deepStrictEqual(JSON.parse(JSON.stringify(run('posicaoNaLiga(db.alunos[11])'))), { nome:'Shader', pos:2, total:2 });

// ordenacao por evolucao e desempate por nome; nota alta nao vence
usar([
  mk('a','Zeca',9,9),     // 0
  mk('b','Bia',6,4),      // +2
  mk('c','Ana',7,5),      // +2 (empata com Bia, Ana vem antes)
  mk('d','Caio',5,6),     // -1
  mk('e','Duda',8,7.5)    // +0,5
]);
assert.strictEqual(ids(run('ligas()[0].alunos')), 'c,b,e,a,d');

// sem historico = 0 e estreante
usar([mk('n','Novo',3), mk('o','Velho',6,6)]);
assert.strictEqual(run('evolucao(db.alunos[0])'), 0);
assert.strictEqual(run('rotuloEvo(db.alunos[0])'), 'estreante');
assert.strictEqual(run('evolucao(Object.assign({}, db.alunos[0], {mediaAnterior:null}))'), 0);

// diferenca que some no arredondamento da tela (0,0) nao e subida nem queda
usar([mk('z','Zoe',6.52,6.5), mk('y','Yuri',6.48,6.5)]);
assert.strictEqual(run('evolucao(db.alunos[0])'), 0);
[0, 1].forEach(function(i){
  assert.strictEqual(run('rotuloEvo(db.alunos[' + i + '])'), 'estável');
  assert.strictEqual(run('fmtEvo(evolucao(db.alunos[' + i + ']))'), '0,0');
});

// card do aluno: so vizinhos, primeiro nome, sem medias
usar([
  mk('1','Alice Souza',9.7,8),    // +1,7
  mk('2','Bruno Lima',8.3,7),     // +1,3
  mk('3','Carla Dias',7.1,6),     // +1,1
  mk('4','Diego Rocha',6.4,6),    // +0,4
  mk('5','Elisa Prado',5.8,6)     // -0,2
]);
var h = run('cardLigaAluno(db.alunos[2])');   // Carla = 3o
assert(h.indexOf('class="card"') > -1);
assert(h.indexOf('Sua Liga') > -1 && h.indexOf('3º de 5') > -1 && h.indexOf('Pixel') > -1);
assert(h.indexOf('Bruno') > -1 && h.indexOf('Diego') > -1);          // vizinhos
assert(h.indexOf('Alice') === -1 && h.indexOf('Elisa') === -1);      // nao vizinhos
['Souza','Lima','Dias','Rocha','Prado'].forEach(function(s){ assert.strictEqual(h.indexOf(s), -1); });
['9.7','8.3','7.1','6.4','5.8','9,7','8,3','7,1','6,4','5,8'].forEach(function(s){ assert.strictEqual(h.indexOf(s), -1, s); });
assert(h.indexOf('+1,3') > -1 && h.indexOf('+0,4') > -1);
var hu = run('cardLigaAluno(db.alunos[4])');                         // ultimo: so 1 vizinho
assert(hu.indexOf('Diego') > -1 && hu.indexOf('Carla') === -1 && hu.indexOf('caiu') > -1);

// escape
usar([mk('s','<script>alert(1)</script> Mau',7,5), mk('t','Outro',7,6)]);
['cardLigaAluno(db.alunos[1])', 'cardLigasProfessor()'].forEach(function(c){
  var x = run(c);
  assert.strictEqual(x.indexOf('<script>'), -1, c);
  assert(x.indexOf('&lt;script&gt;') > -1, c);
});

// professor: medias, anterior, 1o destacado; vazio amigavel
usar([mk('p','Pri',8,6), mk('q','Quin',6,6)]);
var hp = run('cardLigasProfessor()');
assert(hp.indexOf('Ligas por evolução') > -1 && hp.indexOf('antes 6.0') > -1 && hp.indexOf('topo') > -1);
usar([]);
assert(run('cardLigasProfessor()').indexOf('vazio') > -1);

console.log('ranking.teste.js: todos os testes passaram');
