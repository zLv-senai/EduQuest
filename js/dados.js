/* =========================================================
   ETAPA 1 - MODELO DE DADOS + PERSISTENCIA (localStorage)
   ========================================================= */
// v3: faltas com data e justificativa; as versoes antigas ficam guardadas no navegador, intocadas
var KEY = 'eduquest_v3';

var MATERIAS = ['Lógica de Programação','Game Design','Arte para Jogos','Banco de Dados','Matemática para Jogos'];
var ABREV    = ['Lógica','Game Design','Arte','Banco de Dados','Matemática'];

var MEDALHAS = [
  { nome:'Primeira Nota', icone:'\u{1F31F}' },
  { nome:'Nota Máxima',   icone:'\u{1F48E}' },
  { nome:'Sem Faltas',    icone:'\u{1F3AF}' },
  { nome:'Nível 5',       icone:'\u{1F451}' }
];

var db  = { alunos: [] };   // banco em memoria, espelho do localStorage
var sel = null;             // id do aluno selecionado
var aba = 'perfil';

function uid(){
  return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

// matricula de 9 digitos, igual ao campo ID do mockup
function novaMatricula(){
  var s = '';
  for (var i=0;i<9;i++) s += Math.floor(Math.random()*10);
  return s;
}

function novasMaterias(){
  return MATERIAS.map(function(n){ return { nome:n, nota:0 }; });
}

function novoAluno(nome){
  return { id:uid(), matricula:novaMatricula(), nome:nome, faltas:0, xp:0, nivel:1, medalhas:[], materias:novasMaterias(), mediaAnterior:null, moedas:0, missao:null, ausencias:[] };
}

// devolve false quando o navegador recusa (ex.: atestado grande demais para o localStorage)
function salvar(){
  try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
  catch(e){ aviso('Não foi possível salvar neste navegador', true); return false; }
}

function carregar(){
  var bruto = null;
  try { bruto = localStorage.getItem(KEY); } catch(e){ bruto = null; }

  var lido = null;
  if (bruto) {
    try { lido = JSON.parse(bruto); } catch(e){ lido = null; }
  }

  if (lido && Array.isArray(lido.alunos)) {
    db = lido;                       // ja existia dado salvo
  } else {
    db = { alunos: [] };             // primeiro carregamento
    semear();
    salvar();
  }
  // conserta registros incompletos vindos de versoes antigas
  db.alunos.forEach(function(a){
    if (!Array.isArray(a.materias) || !a.materias.length) a.materias = novasMaterias();
    // dados salvos com as materias antigas (metalurgia) ganham os nomes novos, mantendo as notas
    a.materias.forEach(function(m,i){ if (MATERIAS[i]) m.nome = MATERIAS[i]; });
    if (!Array.isArray(a.medalhas)) a.medalhas = [];
    if (!a.matricula) a.matricula = novaMatricula();
    a.faltas = Number(a.faltas) || 0;
    a.xp     = Number(a.xp) || 0;
    a.nivel  = Number(a.nivel) || 1;
    var ant = Number(a.mediaAnterior);
    a.mediaAnterior = (a.mediaAnterior == null || a.mediaAnterior === '' || isNaN(ant)) ? null : ant;
    prepararMissoes(a);
    prepararFrequencia(a);
  });
  if (db.alunos.length) sel = db.alunos[0].id;
}

function semear(){
  var base = [
    { nome:'Ana Souza',      notas:[9,10,8.5,9.5,9],  xp:60, nivel:5, ant:9.0, aus:[] },
    { nome:'Bruno Lima',     notas:[7,6.5,8,5.5,7],   xp:40, nivel:3, ant:5.6,
      aus:[{o:12, t:'Consulta no dentista.', s:'aceita'}, {o:25}, {o:40}] },
    { nome:'Carla Dias',     notas:[5,4.5,6,5,3.5],   xp:10, nivel:2, ant:4.0,
      aus:[{o:0}, {o:1}, {o:2}, {o:9, t:'Fiquei doente, estava com febre.', s:'pendente'}, {o:17}, {o:23}, {o:29}] },
    { nome:'Diego Rocha',    notas:[8,7.5,9,8,8.5],   xp:30, nivel:4, ant:8.6, aus:[{o:8}] },
    { nome:'Eduarda Melo',   notas:[6,7,6.5,7,6],     xp:50, nivel:2, ant:6.5, aus:[{o:15}, {o:33}] },
    { nome:'Felipe Ramos',   notas:[9.5,9,10,9,9.5],  xp:80, nivel:6, ant:9.3, aus:[] },
    { nome:'Gabriela Nunes', notas:[5.5,6,7,6.5,6],   xp:20, nivel:2, ant:5.0,
      aus:[{o:1}, {o:2, t:'Precisei cuidar do meu irmão mais novo.', s:'pendente'}, {o:20}, {o:38}] },
    { nome:'Heitor Alves',   notas:[7,8,7.5,7,7.5],   xp:10, nivel:1, ant:null, aus:[] }
  ];
  base.forEach(function(b){
    var a = novoAluno(b.nome);
    // o = dias letivos atras (0 = hoje), para a demonstracao estar sempre atual
    a.ausencias = b.aus.map(function(x){
      var f = novaAusencia(diasLetivosAtras(x.o));
      if (x.t) f.just = { texto:x.t, arquivo:null, enviadaEm:new Date().toISOString(), status:x.s };
      return f;
    });
    a.faltas = a.ausencias.length;
    a.xp     = b.xp;
    a.nivel  = b.nivel;
    a.mediaAnterior = b.ant;   // media do bimestre anterior, base do ranking por evolucao
    a.materias.forEach(function(m,i){ m.nota = b.notas[i]; });
    conferirMedalhas(a);
    db.alunos.push(a);
  });
}

function acharAluno(id){
  for (var i=0;i<db.alunos.length;i++) if (db.alunos[i].id === id) return db.alunos[i];
  return null;
}

function alunoAtual(){ return acharAluno(sel); }
