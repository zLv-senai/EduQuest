/* =========================================================
   FREQUENCIA E EVASAO ESCOLAR
   Cada falta tem data. Daqui saem o alerta de faltas seguidas
   (o professor fica sabendo cedo), a justificativa do aluno
   (texto e/ou atestado em foto ou PDF), a presenca por semana
   e o risco de evasao.
   ========================================================= */
var SEMANAS_GRAFICO = 6;
var MAX_IMG_LADO    = 1000;          // px; a foto do atestado e reduzida antes de salvar
// shortcut: o arquivo fica no localStorage (~5 MB por navegador); no produto vai para o servidor
var MAX_PDF_BYTES   = 900 * 1024;
var STATUS_JUST     = ['pendente','aceita','recusada'];
var RE_ARQUIVO      = /^data:(image\/(png|jpeg|webp|gif)|application\/pdf);base64,/;

var justificando = null;   // id da falta com o formulario aberto (visao do aluno)
var anexoTemp    = null;   // arquivo ja lido, esperando o envio

/* ---------- datas e dias letivos (segunda a sexta) ---------- */
function dataDeIso(iso){
  var p = iso.split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12);   // meio-dia evita erro de horario de verao
}
function ehDiaLetivo(d){ var w = d.getDay(); return w > 0 && w < 6; }

function diaLetivoAnterior(iso){
  var d = dataDeIso(iso);
  do { d.setDate(d.getDate() - 1); } while (!ehDiaLetivo(d));
  return isoDe(d);
}

// n dias letivos antes do ultimo dia letivo (0 = hoje, ou a sexta se hoje for fim de semana)
function diasLetivosAtras(n){
  var d = dataDeIso(hojeISO());
  while (!ehDiaLetivo(d)) d.setDate(d.getDate() - 1);
  for (var i = 0; i < n; i++) {
    do { d.setDate(d.getDate() - 1); } while (!ehDiaLetivo(d));
  }
  return isoDe(d);
}

function dataCurta(iso){
  var p = iso.split('-');
  return ['dom','seg','ter','qua','qui','sex','sáb'][dataDeIso(iso).getDay()] + ' ' + p[2] + '/' + p[1];
}

/* ---------- dados ---------- */
function novaAusencia(data){ return { id:uid(), data:data, just:null }; }

function arquivoValido(arq){
  return !!arq && typeof arq.url === 'string' && RE_ARQUIVO.test(arq.url);
}

// normaliza o que veio do localStorage; nunca salva
function prepararFrequencia(a){
  if (!Array.isArray(a.ausencias)) {
    // dado antigo so tinha o numero de faltas: vira uma falta por semana, sem justificativa
    a.ausencias = [];
    for (var i = 0; i < (Number(a.faltas) || 0); i++) a.ausencias.push(novaAusencia(diasLetivosAtras(5 * i + 3)));
  }
  var vistas = {};
  a.ausencias = a.ausencias.filter(function(f){
    if (!f || !RE_DATA.test(f.data) || vistas[f.data]) return false;
    vistas[f.data] = 1;
    return true;
  });
  a.ausencias.forEach(function(f){
    if (!f.id) f.id = uid();
    if (f.just && typeof f.just === 'object') {
      f.just.texto = String(f.just.texto || '').slice(0, 500);
      if (STATUS_JUST.indexOf(f.just.status) === -1) f.just.status = 'pendente';
      if (!arquivoValido(f.just.arquivo)) f.just.arquivo = null;
    } else {
      f.just = null;
    }
  });
  a.ausencias.sort(function(x, y){ return x.data < y.data ? 1 : -1; });   // mais recente primeiro
  a.faltas = a.ausencias.length;
  return a;
}

function acharAusencia(a, id){
  for (var i = 0; i < a.ausencias.length; i++) if (a.ausencias[i].id === id) return a.ausencias[i];
  return null;
}

/* ---------- regras de evasao ---------- */

// faltas seguidas terminando na falta mais recente
function sequenciaFaltas(a){
  var datas = a.ausencias.map(function(f){ return f.data; });
  if (!datas.length) return { dias:0, ate:null, recente:false };
  var n = 1;
  for (var i = 1; i < datas.length; i++) {
    if (datas[i] === diaLetivoAnterior(datas[i - 1])) n++;
    else break;
  }
  // so vale alerta se a ultima falta foi na ultima semana letiva
  return { dias:n, ate:datas[0], recente: datas[0] >= diasLetivosAtras(4) };
}

function semJustificativa(a){
  return a.ausencias.filter(function(f){ return !f.just || f.just.status === 'recusada'; }).length;
}
function justPendentes(a){
  return a.ausencias.filter(function(f){ return f.just && f.just.status === 'pendente'; }).length;
}

// faltas por semana, da mais antiga para a atual (cada semana = 5 dias letivos)
function faltasPorSemana(a){
  var semanas = [];
  for (var s = SEMANAS_GRAFICO - 1; s >= 0; s--) {
    var ini = diasLetivosAtras(s * 5 + 4), fim = diasLetivosAtras(s * 5);
    semanas.push(a.ausencias.filter(function(f){ return f.data >= ini && f.data <= fim; }).length);
  }
  return semanas;
}

function frequenciaPct(a){
  var total = SEMANAS_GRAFICO * 5;
  var faltas = faltasPorSemana(a).reduce(function(s, n){ return s + n; }, 0);
  return Math.round((total - faltas) / total * 100);
}

function riscoEvasao(a){
  var p = 0, motivos = [];
  var s = sequenciaFaltas(a);
  if (s.recente && s.dias >= 3)      { p += 3; motivos.push(s.dias + ' faltas seguidas'); }
  else if (s.recente && s.dias >= 2) { p += 2; motivos.push('2 faltas seguidas'); }
  var sj = semJustificativa(a);
  if (sj >= 3)      { p += 2; motivos.push(sj + ' faltas sem justificativa'); }
  else if (sj >= 1) { p += 1; }
  if (media(a) < 6) { p += 2; motivos.push('média ' + n1(media(a))); }
  var fr = frequenciaPct(a);
  if (fr < 75)      { p += 2; motivos.push('frequência de ' + fr + '%'); }
  var nivel = p >= 5 ? 'alto' : (p >= 3 ? 'medio' : 'baixo');
  return { pontos:p, nivel:nivel, motivos:motivos };
}

var ROTULO_RISCO = { alto:'Risco alto', medio:'Risco médio', baixo:'Risco baixo' };
var ROTULO_JUST  = { pendente:'Em análise', aceita:'Justificada', recusada:'Recusada' };

function chipRisco(r){ return '<span class="chip-risco ' + r.nivel + '">' + ROTULO_RISCO[r.nivel] + '</span>'; }

function chipStatus(f){
  if (!f.just) return '<span class="chip-just sem">Sem justificativa</span>';
  return '<span class="chip-just ' + f.just.status + '">' + ROTULO_JUST[f.just.status] + '</span>';
}

/* ---------- grafico de presenca por semana (SVG) ---------- */
function graficoSemanasSVG(a){
  var sem = faltasPorSemana(a), W = 300, H = 120, base = 92, alt = 70, larg = 34;
  var passo = W / sem.length;
  var resumo = sem.map(function(f, i){ return 'semana ' + (i + 1) + ': ' + ((5 - f) * 20) + '%'; }).join(', ');
  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Presença por semana. ' + resumo + '">';
  sem.forEach(function(f, i){
    var pct = (5 - Math.min(5, f)) / 5;
    var h = Math.max(3, alt * pct), x = i * passo + (passo - larg) / 2;
    var cor = pct >= 0.99 ? '#8BCD6A' : (pct >= 0.6 ? '#EFCE74' : '#FF4D6D');
    svg += '<rect x="' + n1(x) + '" y="' + n1(base - h) + '" width="' + larg + '" height="' + n1(h) + '" rx="6" fill="' + cor + '" stroke="#1E357E" stroke-width="2"/>';
    svg += '<text x="' + n1(x + larg / 2) + '" y="' + n1(base - h - 5) + '" text-anchor="middle" font-size="11" font-weight="800" fill="#FFFFFF">' + Math.round(pct * 100) + '%</text>';
    svg += '<text x="' + n1(x + larg / 2) + '" y="' + (base + 18) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#E2D6FF">' +
           (i === sem.length - 1 ? 'atual' : 'S' + (i + 1)) + '</text>';
  });
  return svg + '</svg>';
}

/* ---------- arquivo do atestado ---------- */
function blocoArquivo(f){
  var arq = f.just && f.just.arquivo;
  if (!arquivoValido(arq)) return '';
  if (arq.tipo === 'application/pdf') {
    return '<button type="button" class="freq-arq pdf" data-ver-arq="' + f.id + '">&#128196; Abrir PDF: ' + esc(arq.nome) + '</button>';
  }
  return '<button type="button" class="freq-arq" data-ver-arq="' + f.id + '" aria-label="Ver atestado ' + esc(arq.nome) + '">' +
           '<img src="' + arq.url + '" alt="">' + '<span>Ver atestado</span>' +
         '</button>';
}

/* ---------- PROFESSOR: radar de evasao (topo do painel) ---------- */
function cardRadarEvasao(){
  var lista = db.alunos
    .map(function(a){ return { a:a, r:riscoEvasao(a), s:sequenciaFaltas(a) }; })
    .filter(function(x){ return x.r.nivel !== 'baixo'; })
    .sort(function(x, y){ return y.r.pontos - x.r.pontos; });

  var h = '<div class="card freq-radar"><h2>&#128680; Alerta de evasão</h2>';
  h += '<p class="freq-dica">Aviso a partir de 2 faltas seguidas, antes de o aluno se afastar do curso.</p>';
  if (!lista.length) {
    return h + '<div class="vazio">Ninguém em risco de evasão agora. A turma está frequente!</div></div>';
  }
  lista.forEach(function(x){
    var pend = justPendentes(x.a);
    var seq  = x.s.recente && x.s.dias >= 2
      ? '<b>' + x.s.dias + ' faltas seguidas</b> (até ' + dataCurta(x.s.ate) + ')'
      : esc(x.r.motivos.join(' · '));
    h += '<button type="button" class="freq-aluno ' + x.r.nivel + '" data-ver-aluno="' + x.a.id + '">' +
           '<span class="mini-avatar">' + avatarSVG(x.a) + '</span>' +
           '<span class="freq-aluno-info">' +
             '<span class="freq-aluno-nome">' + esc(x.a.nome) + '</span>' +
             '<span class="freq-aluno-meta">' + seq + '</span>' +
             '<span class="freq-aluno-chips">' + chipRisco(x.r) +
               (pend ? '<span class="chip-just pendente">&#128206; ' + pend + ' para analisar</span>'
                     : (semJustificativa(x.a) ? '<span class="chip-just sem">Sem justificativa</span>' : '')) +
             '</span>' +
           '</span>' +
         '</button>';
  });
  return h + '</div>';
}

/* ---------- PROFESSOR: frequencia no perfil do aluno ---------- */
function cardFrequenciaProf(a){
  var r = riscoEvasao(a);
  var h = '<div class="card" id="freq-card"><h2>Frequência e evasão</h2>';
  h += '<div class="freq-resumo">' + chipRisco(r) +
         '<span class="freq-pct">' + frequenciaPct(a) + '% de presença</span></div>';
  if (r.motivos.length) h += '<p class="freq-dica">Motivos: ' + esc(r.motivos.join(' · ')) + '</p>';
  h += '<div class="freq-grafico">' + graficoSemanasSVG(a) + '</div>';

  h += '<div class="freq-registrar">' +
         '<label for="dataFalta">Registrar falta</label>' +
         '<div class="freq-linha">' +
           '<input type="date" id="dataFalta" max="' + hojeISO() + '" value="' + diasLetivosAtras(0) + '">' +
           '<button type="button" class="acao vermelha" id="btnFalta">+ FALTA</button>' +
         '</div>' +
       '</div>';

  if (!a.ausencias.length) return h + '<div class="vazio">Nenhuma falta registrada.</div></div>';

  h += '<ul class="freq-lista">';
  a.ausencias.forEach(function(f){
    h += '<li class="freq-item">' +
           '<div class="freq-item-topo"><b>' + dataCurta(f.data) + '</b>' + chipStatus(f) +
             '<button type="button" class="del" data-del-falta="' + f.id + '" aria-label="Apagar falta de ' + dataCurta(f.data) + '">&times;</button>' +
           '</div>';
    if (f.just) {
      if (f.just.texto) h += '<p class="freq-texto">&ldquo;' + esc(f.just.texto) + '&rdquo;</p>';
      h += blocoArquivo(f);
      if (f.just.status === 'pendente') {
        h += '<div class="modal-btns freq-avaliar">' +
               '<button type="button" class="acao verde" data-avaliar="' + f.id + '|aceita">ACEITAR</button>' +
               '<button type="button" class="acao cinza" data-avaliar="' + f.id + '|recusada">RECUSAR</button>' +
             '</div>';
      }
    }
    h += '</li>';
  });
  return h + '</ul></div>';
}

/* ---------- ALUNO: minhas faltas + justificar ---------- */
function cardFaltasAluno(a){
  var h = '<div class="card" id="faltas-aluno"><h2>Minhas faltas</h2>';
  if (!a.ausencias.length) return h + '<div class="vazio">Nenhuma falta. Continue assim! &#127775;</div></div>';

  var s = sequenciaFaltas(a);
  h += '<div class="freq-resumo"><span class="freq-pct">' + frequenciaPct(a) + '% de presença</span></div>';
  if (s.recente && s.dias >= 2) {
    h += '<p class="freq-aviso" role="note">Você faltou ' + s.dias + ' dias seguidos. Se aconteceu algo, conte para o professor aqui: ele quer ajudar.</p>';
  }
  h += '<div class="freq-grafico">' + graficoSemanasSVG(a) + '</div>';

  h += '<ul class="freq-lista">';
  a.ausencias.forEach(function(f){
    var podeJustificar = !f.just || f.just.status === 'recusada';
    h += '<li class="freq-item">' +
           '<div class="freq-item-topo"><b>' + dataCurta(f.data) + '</b>' + chipStatus(f) + '</div>';
    if (f.just && f.just.texto) h += '<p class="freq-texto">&ldquo;' + esc(f.just.texto) + '&rdquo;</p>';
    if (f.just && f.just.arquivo) h += '<p class="freq-dica">&#128206; Anexo: ' + esc(f.just.arquivo.nome) + '</p>';

    if (justificando === f.id) {
      h += formJustificativa(f);
    } else if (podeJustificar) {
      h += '<button type="button" class="acao freq-btn-just" data-justificar="' + f.id + '">' +
             (f.just ? 'ENVIAR DE NOVO' : 'JUSTIFICAR FALTA') + '</button>';
    }
    h += '</li>';
  });
  return h + '</ul></div>';
}

function formJustificativa(f){
  return '<div class="freq-form">' +
           '<label for="jTexto">Motivo da falta</label>' +
           '<textarea id="jTexto" maxlength="500" rows="3" placeholder="Ex.: estava com febre e fui ao médico."></textarea>' +
           '<label for="jArquivo">Atestado (foto ou PDF, opcional)</label>' +
           '<input type="file" id="jArquivo" accept="image/*,application/pdf">' +
           '<div id="jPreview" class="freq-preview" aria-live="polite"></div>' +
           '<p class="freq-dica">Atestado é dado de saúde: só o professor da turma vê.</p>' +
           '<div class="modal-btns">' +
             '<button type="button" class="acao cinza" id="btnCancelarJust">CANCELAR</button>' +
             '<button type="button" class="acao verde" id="btnEnviarJust" data-falta="' + f.id + '">ENVIAR</button>' +
           '</div>' +
         '</div>';
}

// le o arquivo escolhido; foto e reduzida em canvas para caber no localStorage
function lerAnexo(arquivo, pronto){
  var ehPdf = arquivo.type === 'application/pdf';
  if (!ehPdf && !/^image\//.test(arquivo.type)) { aviso('Envie uma foto ou um PDF', true); return; }
  if (ehPdf && arquivo.size > MAX_PDF_BYTES) { aviso('PDF grande demais (máx. 900 KB). Tire uma foto do atestado.', true); return; }

  var leitor = new FileReader();
  leitor.onerror = function(){ aviso('Não foi possível ler o arquivo', true); };
  leitor.onload = function(){
    if (ehPdf) { pronto({ nome:arquivo.name, tipo:'application/pdf', url:leitor.result }); return; }
    var img = new Image();
    img.onerror = function(){ aviso('Imagem inválida', true); };
    img.onload = function(){
      var fator = Math.min(1, MAX_IMG_LADO / Math.max(img.width, img.height));
      var cv = document.createElement('canvas');
      cv.width = Math.round(img.width * fator); cv.height = Math.round(img.height * fator);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      pronto({ nome:arquivo.name, tipo:'image/jpeg', url:cv.toDataURL('image/jpeg', 0.72) });
    };
    img.src = leitor.result;
  };
  leitor.readAsDataURL(arquivo);
}

function mostrarPreview(arq){
  var p = document.getElementById('jPreview');
  if (!p) return;
  p.innerHTML = arq.tipo === 'application/pdf'
    ? '<span>&#128196; ' + esc(arq.nome) + ' pronto para enviar</span>'
    : '<img src="' + arq.url + '" alt="Prévia do atestado"><span>' + esc(arq.nome) + '</span>';
}

function enviarJustificativa(a, faltaId){
  var f = acharAusencia(a, faltaId);
  if (!f) return;
  var texto = document.getElementById('jTexto').value.trim();
  if (!texto && !anexoTemp) { aviso('Escreva o motivo ou anexe o atestado', true); return; }

  var antes = f.just;
  f.just = { texto:texto.slice(0, 500), arquivo:anexoTemp, enviadaEm:new Date().toISOString(), status:'pendente' };
  if (!salvar()) {
    f.just = antes;   // nao deixa na tela algo que nao foi salvo
    aviso('Não coube no navegador. Tente uma foto menor ou envie só o texto.', true);
    return;
  }
  justificando = null; anexoTemp = null;
  render();
  aviso('\u{1F4E8} Justificativa enviada ao professor');
}

/* ---------- PROFESSOR: acoes ---------- */
function registrarFalta(a){
  var el = document.getElementById('dataFalta');
  var d = el.value;
  if (!RE_DATA.test(d))            { aviso('Escolha a data da falta', true); el.focus(); return; }
  if (d > hojeISO())               { aviso('A falta não pode ser no futuro', true); el.focus(); return; }
  if (!ehDiaLetivo(dataDeIso(d)))  { aviso('Escolha um dia de aula (segunda a sexta)', true); el.focus(); return; }
  if (a.ausencias.some(function(f){ return f.data === d; })) { aviso('Já existe falta nesse dia', true); return; }

  a.ausencias.push(novaAusencia(d));
  prepararFrequencia(a);
  salvar();
  render();
  aviso('Falta registrada: ' + dataCurta(d));
  var s = sequenciaFaltas(a);
  if (s.recente && s.dias >= 2) aviso('\u{1F6A8} ' + a.nome + ' faltou ' + s.dias + ' dias seguidos', true);
}

function abrirArquivo(arq){
  if (!arquivoValido(arq)) return;
  if (arq.tipo === 'application/pdf') {
    // o navegador bloqueia abrir data: direto; vira blob
    var bin = atob(arq.url.split(',')[1]), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    window.open(URL.createObjectURL(new Blob([bytes], { type:'application/pdf' })), '_blank');
    return;
  }
  var fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = '<div class="modal freq-modal" role="dialog" aria-modal="true" aria-label="Atestado">' +
                      '<h2>Atestado</h2><img alt="Atestado enviado pelo aluno">' +
                      '<button class="acao cinza" data-fechar>FECHAR</button>' +
                    '</div>';
  fundo.querySelector('img').src = arq.url;
  function fechar(){ fundo.remove(); document.removeEventListener('keydown', tecla); }
  function tecla(e){ if (e.key === 'Escape') fechar(); }
  fundo.querySelector('[data-fechar]').onclick = fechar;
  fundo.onclick = function(e){ if (e.target === fundo) fechar(); };
  document.addEventListener('keydown', tecla);
  document.body.appendChild(fundo);
  fundo.querySelector('[data-fechar]').focus();
}

/* ---------- eventos (chamado no fim de ligarEventos) ---------- */
function ligarFrequencia(){
  var a = perfil === 'aluno' ? acharAluno(euSou) : alunoAtual();

  document.querySelectorAll('[data-ver-aluno]').forEach(function(b){
    b.onclick = function(){
      sel = this.dataset.verAluno;
      if (!ehDesktop()) aba = 'perfil';
      render();
      var c = document.getElementById('freq-card');
      if (c) c.scrollIntoView({ behavior:'smooth', block:'start' });
    };
  });

  var bf = document.getElementById('btnFalta');
  if (bf && a) bf.onclick = function(){ registrarFalta(a); };

  document.querySelectorAll('[data-del-falta]').forEach(function(b){
    b.onclick = function(){
      var id = this.dataset.delFalta, f = a && acharAusencia(a, id);
      if (!f) return;
      confirmar('Apagar a falta de ' + dataCurta(f.data) + '? A justificativa dela também some.', function(){
        a.ausencias = a.ausencias.filter(function(x){ return x.id !== id; });
        prepararFrequencia(a); salvar(); render();
        aviso('Falta apagada');
      });
    };
  });

  document.querySelectorAll('[data-avaliar]').forEach(function(b){
    b.onclick = function(){
      var p = this.dataset.avaliar.split('|'), f = a && acharAusencia(a, p[0]);
      if (!f || !f.just || STATUS_JUST.indexOf(p[1]) === -1) return;
      f.just.status = p[1];
      salvar(); render();
      aviso(p[1] === 'aceita' ? 'Falta justificada ✔' : 'Justificativa recusada');
    };
  });

  document.querySelectorAll('[data-ver-arq]').forEach(function(b){
    b.onclick = function(){
      var f = a && acharAusencia(a, this.dataset.verArq);
      if (f && f.just) abrirArquivo(f.just.arquivo);
    };
  });

  // visao do aluno
  document.querySelectorAll('[data-justificar]').forEach(function(b){
    b.onclick = function(){
      justificando = this.dataset.justificar; anexoTemp = null;
      render();
      var t = document.getElementById('jTexto');
      if (t) t.focus();
    };
  });
  var ja = document.getElementById('jArquivo');
  if (ja) ja.onchange = function(){
    if (!this.files || !this.files[0]) return;
    lerAnexo(this.files[0], function(arq){ anexoTemp = arq; mostrarPreview(arq); });
  };
  var bc = document.getElementById('btnCancelarJust');
  if (bc) bc.onclick = function(){ justificando = null; anexoTemp = null; render(); };
  var be = document.getElementById('btnEnviarJust');
  if (be && a) be.onclick = function(){ enviarJustificativa(a, this.dataset.falta); };
}
