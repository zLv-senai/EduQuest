/* =========================================================
   RENDER + EVENTOS
   ========================================================= */

// o cabecalho muda conforme quem entrou
function atualizarCabecalho(){
  var abas = document.querySelector('.abas');
  var env  = document.getElementById('btnAlertas');
  var sair = document.getElementById('btnSair');

  // as abas so existem para o professor no celular; no monitor o CSS ja
  // as esconde, e por isso aqui volta para o valor da folha de estilo
  abas.style.display = (perfil === 'professor') ? '' : 'none';
  env.style.visibility = perfil ? 'visible' : 'hidden';
  sair.classList.toggle('aparece', !!perfil);
}

function render(){
  document.querySelectorAll('.aba').forEach(function(b){
    b.classList.toggle('ativa', b.dataset.aba === aba);
  });

  var tela = document.getElementById('tela');

  if (!perfil) {
    tela.innerHTML = telaEscolha();
  } else if (perfil === 'aluno') {
    tela.innerHTML = telaAluno();
  } else if (ehDesktop()) {
    tela.innerHTML = painelProfessor();
  } else if (aba === 'perfil') {
    tela.innerHTML = telaPerfil();
  } else if (aba === 'notas') {
    tela.innerHTML = telaNotas();
  } else if (aba === 'turma') {
    tela.innerHTML = telaTurma();
  } else {
    tela.innerHTML = telaGerenciar();
  }

  atualizarCabecalho();
  ligarEventos();
  atualizarBadge();
}

// ao arrastar a janela entre celular e monitor, redesenha no layout certo
var eraDesktop = null;
window.addEventListener('resize', function(){
  var agora = ehDesktop();
  if (agora !== eraDesktop) { eraDesktop = agora; render(); }
});

function ligarEventos(){
  var sp = document.getElementById('selPerfil');
  if (sp) sp.onchange = function(){ sel = this.value; render(); };

  var sn = document.getElementById('selNotas');
  if (sn) sn.onchange = function(){ sel = this.value; render(); };

  var bs = document.getElementById('btnSalvarNotas');
  if (bs) bs.onclick = salvarNotas;

  var ba = document.getElementById('btnAdd');
  if (ba) ba.onclick = adicionarAluno;

  var nn = document.getElementById('novoNome');
  if (nn) nn.onkeydown = function(e){ if (e.key === 'Enter') adicionarAluno(); };

  var bp = document.getElementById('btnEntrarProf');
  if (bp) bp.onclick = function(){ perfil = 'professor'; aba = 'perfil'; render(); };

  var bal = document.getElementById('btnEntrarAluno');
  if (bal) bal.onclick = function(){
    var s = document.getElementById('selEu');
    perfil = 'aluno';
    euSou  = s ? s.value : (db.alunos[0] || {}).id;
    render();
    aviso('Bem-vindo, ' + (acharAluno(euSou) || {}).nome + '!');
  };

  document.querySelectorAll('[data-sel]').forEach(function(b){
    b.onclick = function(){ sel = this.dataset.sel; render(); };
  });

  document.querySelectorAll('[data-del]').forEach(function(b){
    b.onclick = function(e){ e.stopPropagation(); removerAluno(this.dataset.del); };
  });

  ligarMissoes();
  ligarFrequencia();
}

document.querySelectorAll('.aba').forEach(function(b){
  b.onclick = function(){ aba = this.dataset.aba; render(); };
});

document.getElementById('btnAlertas').onclick = painelAlertas;

document.getElementById('btnSair').onclick = function(){
  perfil = null; euSou = null; aba = 'perfil'; render();
};

carregar();
render();
