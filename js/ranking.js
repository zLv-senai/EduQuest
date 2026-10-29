/* =========================================================
   RANKING POR EVOLUCAO EM LIGAS (contradicao TRIZ)
   Segmentacao: ligas de ate 5 alunos
   Inversao: ordena por evolucao, nao por nota
   Extracao: o aluno ve so a si e os vizinhos, sem notas
   ========================================================= */
var TAMANHO_LIGA = 5;
var NOMES_LIGAS = ['Pixel','Sprite','Shader','Render','Voxel','Tileset','Mesh','Frame','Engine','Buffer'];

function temHistorico(a){
  return typeof a.mediaAnterior === 'number' && isFinite(a.mediaAnterior);
}

// evolucao = media atual - media do bimestre anterior, arredondada em uma casa como aparece na tela (0 se nao ha historico)
function evolucao(a){
  if (!temHistorico(a)) return 0;
  return Math.round((media(a) - a.mediaAnterior) * 10) / 10;
}

function nomeDaLiga(i){
  var base = NOMES_LIGAS[i % NOMES_LIGAS.length];
  var ciclo = Math.floor(i / NOMES_LIGAS.length);
  return ciclo ? base + ' ' + (ciclo + 1) : base;
}

// maior evolucao primeiro; empate pelo nome
function porEvolucao(x, y){
  var d = evolucao(y) - evolucao(x);
  if (d !== 0) return d;
  return String(x.nome).localeCompare(String(y.nome), 'pt-BR');
}

// divide db.alunos (ordem de cadastro) em ligas de TAMANHO_LIGA
function ligas(){
  var lista = [];
  for (var i = 0; i < db.alunos.length; i += TAMANHO_LIGA) {
    lista.push({
      nome: nomeDaLiga(lista.length),
      alunos: db.alunos.slice(i, i + TAMANHO_LIGA).sort(porEvolucao)
    });
  }
  return lista;
}

// {nome, pos, total} da liga do aluno; pos comeca em 1 (null se nao achar)
function posicaoNaLiga(a){
  var ls = ligas();
  for (var i = 0; i < ls.length; i++) {
    for (var j = 0; j < ls[i].alunos.length; j++) {
      if (ls[i].alunos[j].id === a.id) return { nome: ls[i].nome, pos: j + 1, total: ls[i].alunos.length };
    }
  }
  return null;
}

function primeiroNome(nome){
  return String(nome).trim().split(/\s+/)[0] || '?';
}

// "+1,2" / "-0,8" / "0,0", com virgula
function fmtEvo(v){
  var t = n1(Math.abs(v)).replace('.', ',');
  if (v > 0) return '+' + t;
  if (v < 0) return '−' + t;
  return t;
}

// sinal em texto alem da cor
function rotuloEvo(a){
  if (!temHistorico(a)) return 'estreante';
  var v = evolucao(a);
  return v > 0 ? 'subiu' : (v < 0 ? 'caiu' : 'estável');
}

function classeEvo(a){
  var v = evolucao(a);
  return v > 0 ? 'pos' : (v < 0 ? 'neg' : 'zero');
}

function ordinal(n){ return n + 'º'; }

/* ---------- aluno: so ele e os vizinhos ---------- */
function cardLigaAluno(a){
  var p = posicaoNaLiga(a);
  if (!p) return '<div class="card"><h2>Sua Liga</h2><div class="vazio">Você ainda não está em uma liga.</div></div>';

  var liga = ligas().filter(function(l){ return l.nome === p.nome; })[0].alunos;
  var i = p.pos - 1;
  var h = '<div class="card"><h2>Sua Liga</h2>';
  h += '<div class="liga-pos">Você está em <b>' + ordinal(p.pos) + ' de ' + p.total + '</b> na Liga <b>' + esc(p.nome) + '</b></div>';

  h += '<div class="liga-lista">';
  [i - 1, i, i + 1].forEach(function(k){
    var x = liga[k];
    if (!x) return;
    var eu = (k === i);
    h += '<div class="liga-linha' + (eu ? ' eu' : '') + '">' +
           '<span class="liga-n">' + ordinal(k + 1) + '</span>' +
           '<span class="liga-nome">' + (eu ? 'Você' : esc(primeiroNome(x.nome))) + '</span>' +
           '<span class="liga-evo ' + classeEvo(x) + '">' + fmtEvo(evolucao(x)) + ' <small>' + rotuloEvo(x) + '</small></span>' +
         '</div>';
  });
  h += '</div>';

  h += '<div class="liga-dica">Quem mais melhora sobe na liga, não importa de onde partiu.</div>';
  h += '</div>';
  return h;
}

/* ---------- professor: todas as ligas ---------- */
function cardLigasProfessor(){
  var ls = ligas();
  if (!ls.length) {
    return '<div class="card"><h2>Ligas por evolução</h2><div class="vazio">Nenhuma liga ainda.<br>Cadastre alunos em <b>GERENCIAR</b> para formar as ligas.</div></div>';
  }
  var h = '<div class="card"><h2>Ligas por evolução</h2>';
  ls.forEach(function(l){
    h += '<div class="liga-bloco"><div class="liga-titulo">Liga ' + esc(l.nome) + '</div>';
    l.alunos.forEach(function(a, k){
      var ant = temHistorico(a) ? n1(a.mediaAnterior) : '—';
      h += '<div class="liga-prof' + (k === 0 ? ' topo' : '') + '">' +
             '<span class="liga-n">' + (k === 0 ? '\u{1F3C6} ' + ordinal(1) : ordinal(k + 1)) + '</span>' +
             '<span class="liga-nome">' + esc(a.nome) + '</span>' +
             '<span class="liga-medias">' + n1(media(a)) + ' <small>antes ' + ant + '</small></span>' +
             '<span class="liga-evo ' + classeEvo(a) + '">' + fmtEvo(evolucao(a)) + ' <small>' + rotuloEvo(a) + '</small></span>' +
           '</div>';
    });
    h += '</div>';
  });
  h += '</div>';
  return h;
}
