/* =========================================================
   UTILIDADES DE TELA
   ========================================================= */
function esc(s){
  return String(s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function n1(v){ return (Math.round(v*10)/10).toFixed(1); }
function semZero(v){ return n1(v).replace(/\.0$/,''); }

function aviso(msg, erro){
  var d = document.createElement('div');
  d.className = 'aviso' + (erro ? ' erro' : '');
  d.textContent = msg;
  document.getElementById('avisos').appendChild(d);
  setTimeout(function(){ d.remove(); }, 3200);
}

function seletorAluno(idEl){
  return '<label>Aluno</label><select id="'+idEl+'">' +
    db.alunos.map(function(a){
      return '<option value="'+a.id+'"'+(a.id===sel?' selected':'')+'>'+esc(a.nome)+'</option>';
    }).join('') + '</select>';
}

function atualizarBadge(){
  var n = listaAlertasAtual().length;
  var b = document.getElementById('badgeAlertas');
  b.textContent = n;
  b.className = 'badge' + (n ? '' : ' zero');
}

function painelAlertas(){
  var lista = listaAlertasAtual();
  var corpo = itensAlerta(lista);

  var f = document.createElement('div');
  f.className = 'modal-fundo';
  f.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' +
                  '<h2>Alertas da turma</h2>' + corpo +
                  '<div style="height:12px"></div>' +
                  '<button class="acao cinza" data-fechar>FECHAR</button>' +
                '</div>';

  function fechar(){ f.remove(); document.removeEventListener('keydown', tecla); }
  function tecla(e){ if (e.key === 'Escape') fechar(); }

  f.querySelector('[data-fechar]').onclick = fechar;
  f.onclick = function(e){ if (e.target === f) fechar(); };
  document.addEventListener('keydown', tecla);

  document.body.appendChild(f);
  f.querySelector('[data-fechar]').focus();
}

/* =========================================================
   TELA - PERFIL DO ALUNO
   ========================================================= */

// uma linha da ficha: pilula de rotulo + pilula de valor
function linhaFicha(rot, val, corRot, corVal){
  return '<div class="linha-ficha">' +
           '<span class="rot ' + corRot + '">' + rot + '</span>' +
           '<span class="val ' + corVal + '">' + val + '</span>' +
         '</div>';
}

function corDoSelo(cls){
  if (cls === 'otimo')   return 'amarelo';
  if (cls === 'bom')     return 'verde';
  if (cls === 'regular') return 'ciano';
  return 'vermelho';
}

function medalhasResumo(a){
  var g = MEDALHAS.filter(function(md){ return a.medalhas.indexOf(md.nome) !== -1; });
  if (!g.length) return '<span style="font-size:10px;opacity:.85">nenhuma ainda</span>';
  var icones = g.slice(0,3).map(function(md){ return md.icone; }).join('');
  var resto  = g.length - 3;
  return icones + (resto > 0 ? '<span class="mais">+' + resto + '</span>' : '');
}

function telaPerfil(semSeletor){
  if (!db.alunos.length) {
    return '<div class="card"><div class="vazio">Nenhum aluno cadastrado.<br>Vá em <b>GERENCIAR</b> para adicionar.</div></div>';
  }
  var a = alunoAtual() || db.alunos[0];
  sel = a.id;

  var m     = media(a);
  var s     = selo(m);
  var custo = 100 * a.nivel;
  var pct   = Math.min(100, (a.xp / custo) * 100);
  var pl    = posicaoNaLiga(a);

  var h = semSeletor ? '' : '<div class="card so-mobile">' + seletorAluno('selPerfil') + '</div>';

  // ficha: avatar + pilulas
  h += '<div class="card"><div class="ficha">';
  h +=   '<div class="ficha-foto">' + avatarSVG(a) + '</div>';
  h +=   '<div class="ficha-dados">';
  h +=     linhaFicha('Nome',   esc(a.nome),      '', '');
  h +=     linhaFicha('ID',     esc(a.matricula), '', '');
  h +=     linhaFicha('Selo',   s.txt,            '', corDoSelo(s.cls));
  h +=     linhaFicha('Liga',   pl.pos + 'º · ' + esc(pl.nome), '', pl.pos === 1 ? 'amarelo' : 'ciano');
  h +=     linhaFicha('Faltas', a.faltas, 'vermelho', '');
  h +=     linhaFicha('Moedas', a.moedas, 'amarelo', '');
  h +=     '<div class="linha-ficha">' +
             '<span class="rot amarelo">Medalhas</span>' +
             '<span class="val val-medalhas">' + medalhasResumo(a) + '</span>' +
           '</div>';
  h +=   '</div>';
  h += '</div></div>';

  // so o aluno logado ve a missao e a propria liga, logo abaixo da ficha
  if (semSeletor) h += cardFaltasAluno(a) + cardMissoes(a) + cardLigaAluno(a);
  else            h += cardFrequenciaProf(a);

  // progresso
  h += '<div class="card"><h2>Progresso</h2>';
  h +=   '<div class="stats">';
  h +=     '<div class="stat"><b>' + n1(m) + '</b><small>Média</small></div>';
  h +=     '<div class="stat"><b>' + a.nivel + '</b><small>Nível</small></div>';
  h +=     '<div class="stat"><b>' + semZero(a.xp) + '</b><small>XP</small></div>';
  h +=   '</div>';
  h +=   '<div class="xp-linha"><span>Para o nível ' + (a.nivel + 1) + '</span><span>' + semZero(a.xp) + ' / ' + custo + '</span></div>';
  h +=   '<div class="xp-fundo"><div class="xp-barra" style="width:' + pct + '%"></div></div>';
  h += '</div>';

  // medalhas detalhadas
  h += '<div class="card"><h2>Medalhas</h2><div class="medalhas">';
  MEDALHAS.forEach(function(md){
    var ok = a.medalhas.indexOf(md.nome) !== -1;
    h += '<div class="medalha' + (ok ? ' ok' : '') + '"><span class="ic">' + md.icone + '</span><span class="tx">' + esc(md.nome) + '</span></div>';
  });
  h += '</div></div>';

  // radar + notas
  h += '<div class="card"><h2>Desempenho</h2>' + radarSVG(a) + '<div class="lista-notas">';
  a.materias.forEach(function(mt){
    var baixa = Number(mt.nota) < 6;
    h += '<div class="linha-nota' + (baixa ? ' baixa' : '') + '"><span>' + esc(mt.nome) + (baixa ? ' &#9888;' : '') + '</span><b>' + n1(mt.nota) + '</b></div>';
  });
  h += '</div></div>';

  return h;
}

/* =========================================================
   TELA - LANCAR NOTAS
   ========================================================= */
function telaNotas(){
  if (!db.alunos.length) {
    return '<div class="card"><div class="vazio">Cadastre um aluno em <b>GERENCIAR</b> antes de lançar notas.</div></div>';
  }
  var a = alunoAtual() || db.alunos[0];
  sel = a.id;

  var h = '<div class="card so-mobile">' + seletorAluno('selNotas') + '</div>';

  h += '<div class="card"><h2>Notas (0 a 10)</h2>';
  a.materias.forEach(function(mt,i){
    var baixa = Number(mt.nota) < 6;
    h += '<div style="margin-bottom:10px">' +
           '<label'+(baixa?' style="color:#FF4D6D"':'')+'>'+esc(mt.nome)+(baixa?' ⚠ baixo desempenho':'')+'</label>' +
           '<input type="number" step="0.1" min="0" max="10" id="nota'+i+'" value="'+mt.nota+'">' +
         '</div>';
  });
  h += '</div>';

  h += '<button class="acao" id="btnSalvarNotas">SALVAR NOTAS</button>';
  return h;
}

// Validacao + XP + nivel + medalhas
function salvarNotas(){
  var a = alunoAtual();
  if (!a) return;

  var valores = [];
  for (var i=0;i<a.materias.length;i++){
    var el = document.getElementById('nota'+i);
    var bruto = el.value.trim();
    if (bruto === '') { aviso('Preencha a nota de ' + a.materias[i].nome, true); el.focus(); return; }
    var v = Number(bruto.replace(',','.'));
    if (isNaN(v))          { aviso('Nota inválida em ' + a.materias[i].nome, true); el.focus(); return; }
    if (v < 0 || v > 10)   { aviso('A nota deve ficar entre 0 e 10', true); el.focus(); return; }
    valores.push(v);
  }

  // XP entra apenas para nota que realmente mudou, senao daria para
  // farmar XP infinito clicando em salvar com os mesmos valores
  var ganho = 0;
  valores.forEach(function(v,i){
    if (Number(a.materias[i].nota) !== v) ganho += v * 10;
    a.materias[i].nota = v;
  });
  a.xp += ganho;

  var subiu   = subirNivel(a);
  var novasMd = conferirMedalhas(a);

  salvar();
  render();

  aviso('Notas salvas! +' + semZero(ganho) + ' XP');
  subiu.forEach(function(nv){   aviso('\u{1F389} Subiu para o nível ' + nv + '!'); });
  novasMd.forEach(function(md){ aviso('\u{1F3C5} Medalha conquistada: ' + md); });
}

/* =========================================================
   TELA - TURMA (visao do professor)
   ========================================================= */
function telaTurma(){
  if (!db.alunos.length) {
    return '<div class="card"><div class="vazio">Nenhum aluno cadastrado ainda.</div></div>';
  }
  var lista = db.alunos
    .map(function(a){ return { nome:a.nome, m:media(a) }; })
    .sort(function(x,y){ return y.m - x.m; });   // maior media primeiro

  var mediaTurma = lista.reduce(function(s,x){ return s + x.m; }, 0) / lista.length;
  var emRisco    = lista.filter(function(x){ return x.m < 6; }).length;

  var h = '<div class="card"><h2>Visão da Turma</h2>';
  h += '<div class="stats" style="margin-bottom:16px">';
  h +=   '<div class="stat"><b>'+lista.length+'</b><small>Alunos</small></div>';
  h +=   '<div class="stat"><b>'+n1(mediaTurma)+'</b><small>Média geral</small></div>';
  h +=   '<div class="stat'+(emRisco?' alerta':'')+'"><b>'+emRisco+'</b><small>Em risco</small></div>';
  h += '</div>';

  lista.forEach(function(x){
    var baixa = x.m < 6;
    h += '<div class="barra-item">' +
           '<div class="barra-topo"><span>'+esc(x.nome)+'</span>' +
           '<b class="'+(baixa?'baixa':'')+'">'+n1(x.m)+'</b></div>' +
           '<div class="barra-fundo"><div class="barra-valor '+(baixa?'baixa':'')+'" style="width:'+(x.m*10)+'%"></div></div>' +
         '</div>';
  });
  h += '</div>';
  // no celular o radar abre a aba; no monitor ele ja esta no topo da coluna
  return (ehDesktop() ? '' : cardRadarEvasao()) + h + cardLigasProfessor();
}

/* =========================================================
   TELA - GERENCIAR
   ========================================================= */
function telaGerenciar(){
  var h = '<div class="card"><h2>Adicionar aluno</h2>' +
            '<label>Nome</label>' +
            '<input id="novoNome" placeholder="Nome do aluno" maxlength="40">' +
            '<div style="height:12px"></div>' +
            '<button class="acao verde" id="btnAdd">+ ADICIONAR ALUNO</button>' +
          '</div>';

  h += '<div class="card"><h2>Alunos ('+db.alunos.length+')</h2>';
  if (!db.alunos.length) {
    h += '<div class="vazio">Lista vazia.</div>';
  } else {
    db.alunos.forEach(function(a){
      h += '<div class="item-aluno' + (a.id === sel ? ' ativo' : '') + '" data-sel="'+a.id+'">' +
             '<div class="mini-avatar">'+avatarSVG(a)+'</div>' +
             '<div class="info">' +
               '<div class="nome">'+esc(a.nome)+'</div>' +
               '<div class="meta">ID '+a.matricula+' &middot; Média '+n1(media(a))+' &middot; Nível '+a.nivel+'</div>' +
             '</div>' +
             '<button class="del" data-del="'+a.id+'" title="Remover">&times;</button>' +
           '</div>';
    });
  }
  h += '</div>';
  return h;
}

function adicionarAluno(){
  var el = document.getElementById('novoNome');
  var nome = el.value.trim();
  if (nome === '') { aviso('Digite o nome do aluno', true); el.focus(); return; }

  var a = novoAluno(nome);
  conferirMedalhas(a);            // aluno novo ja nasce com "Sem Faltas"
  db.alunos.push(a);
  sel = a.id;
  salvar();
  render();
  aviso(nome + ' entrou na turma!');
}

// Caixa de confirmacao propria. O confirm() nativo e bloqueado quando a
// pagina roda dentro de um iframe com sandbox (o caso da versao publicada),
// e ali o botao de remover falharia sem dizer nada.
function confirmar(msg, aoSim){
  var f = document.createElement('div');
  f.className = 'modal-fundo';
  f.innerHTML =
    '<div class="modal" role="dialog" aria-modal="true">' +
      '<p>' + esc(msg) + '</p>' +
      '<div class="modal-btns">' +
        '<button class="acao cinza" data-nao>CANCELAR</button>' +
        '<button class="acao vermelha" data-sim>REMOVER</button>' +
      '</div>' +
    '</div>';

  function fechar(){ f.remove(); document.removeEventListener('keydown', tecla); }
  function tecla(e){ if (e.key === 'Escape') fechar(); }

  f.querySelector('[data-nao]').onclick = fechar;
  f.querySelector('[data-sim]').onclick = function(){ fechar(); aoSim(); };
  f.onclick = function(e){ if (e.target === f) fechar(); };
  document.addEventListener('keydown', tecla);

  document.body.appendChild(f);
  f.querySelector('[data-nao]').focus();
}

function removerAluno(id){
  var a = acharAluno(id);
  if (!a) return;

  confirmar('Remover ' + a.nome + '? As notas, o XP e as medalhas serao apagados.', function(){
    db.alunos = db.alunos.filter(function(x){ return x.id !== id; });
    if (sel === id) sel = db.alunos.length ? db.alunos[0].id : null;
    salvar();
    render();
    aviso(a.nome + ' foi removido');
  });
}

/* =========================================================
   DESKTOP - PAINEL DO PROFESSOR
   No celular o app continua em abas. A partir de 1000px de
   largura as abas somem e as quatro telas aparecem juntas,
   em tres colunas. E o mesmo codigo das telas, so que
   arrumado de outro jeito - nada aqui e duplicado.
   ========================================================= */
function ehDesktop(){
  return window.matchMedia('(min-width:1000px)').matches;
}

// os itens de alerta servem para o painel lateral e para a janela do envelope
function itensAlerta(lista){
  if (!lista.length) {
    return '<div class="vazio">Nenhum alerta.<br>Ninguém abaixo de 6 e ninguém com 5 faltas ou mais.</div>';
  }
  return lista.map(function(al){
    return '<div class="alerta-item ' + al.tipo + '">' +
             '<span class="pt">' + al.ic + '</span><span>' + esc(al.txt) + '</span>' +
           '</div>';
  }).join('');
}

function cardAlertas(){
  var lista = listaAlertasAtual();
  return '<div class="card"><h2>Alertas' + (lista.length ? ' (' + lista.length + ')' : '') + '</h2>' +
           itensAlerta(lista) +
         '</div>';
}

function painelProfessor(){
  return '<div class="painel">' +
           '<div class="col-lado">'   + telaGerenciar() + '</div>' +
           '<div class="col-centro">' + telaPerfil() + telaNotas() + '</div>' +
           '<div class="col-lado">'   + cardRadarEvasao() + cardAlertas() + telaTurma() + '</div>' +
         '</div>';
}

/* =========================================================
   PERFIL DE ACESSO (professor ou aluno)
   Ainda nao e login de verdade: nao ha senha nem conta. E o
   lugar preparado para o login entrar depois, e ja separa o
   que cada um enxerga.
   ========================================================= */
var perfil = null;   // null = tela de escolha | 'professor' | 'aluno'
var euSou  = null;   // id do aluno que entrou, quando perfil e 'aluno'

function telaEscolha(){
  var h = '<div class="tela-escolha">';
  h += '<div class="card"><h2>Quem está entrando?</h2>';
  h +=   '<button class="acao" id="btnEntrarProf">SOU PROFESSOR</button>';
  h +=   '<div class="escolha-ou">OU</div>';

  if (db.alunos.length) {
    h += '<label>Sou aluno</label>' +
         '<select id="selEu">' +
           db.alunos.map(function(a){
             return '<option value="' + a.id + '">' + esc(a.nome) + '</option>';
           }).join('') +
         '</select>' +
         '<div style="height:10px"></div>' +
         '<button class="acao verde" id="btnEntrarAluno">ENTRAR COMO ALUNO</button>';
  } else {
    h += '<div class="vazio">Nenhum aluno cadastrado ainda.<br>Entre como professor para cadastrar o primeiro.</div>';
  }

  h += '</div>';
  h += '<div class="nota-rodape">Por enquanto a escolha é livre, sem senha.<br>É aqui que o login de verdade vai entrar.</div>';
  h += '</div>';
  return h;
}

/* =========================================================
   VISAO DO ALUNO
   O aluno so ve a si mesmo: nao escolhe outro aluno, nao
   edita nota, nao ve a lista da turma. A posicao dele na
   liga aparece, mas sem revelar a nota de ninguem.
   ========================================================= */

// os alertas do aluno logado, escritos na segunda pessoa
function listaAlertasAtual(){
  if (perfil !== 'aluno') return alertas();
  var eu = acharAluno(euSou);
  if (!eu) return [];
  return alertas()
    .filter(function(al){ return al.id === eu.id; })
    .map(function(al){ return { tipo:al.tipo, ic:al.ic, txt: al.txt.replace(eu.nome, 'Você') }; });
}

function cardMelhorar(){
  var meus = listaAlertasAtual();
  var h = '<div class="card"><h2>O que melhorar</h2>';
  h += meus.length
     ? itensAlerta(meus)
     : '<div class="vazio">Tudo em dia! Nenhuma matéria abaixo de 6 e frequência em ordem.</div>';
  return h + '</div>';
}

function telaAluno(){
  var a = acharAluno(euSou) || db.alunos[0];
  if (!a) {
    return '<div class="card"><div class="vazio">Nenhum aluno cadastrado.</div></div>';
  }
  euSou = a.id;
  sel   = a.id;   // o aluno logado e o "selecionado" para reaproveitar a ficha
  return '<div class="tela-aluno">' + telaPerfil(true) + cardMelhorar() + '</div>';
}
